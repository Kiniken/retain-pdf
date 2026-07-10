"""agentic 检索问答的薄循环。

刻意不用 agent 框架:单 provider(DeepSeek 兼容端点)、单用户本地
服务,裸 function calling 循环 ~200 行即可,超时/轮数/引用编号全部
自持。工具定义与主流 SDK 同构(tools.py),将来要迁移只换这层外壳。
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Callable

import httpx

from .config import Settings
from .tools import ToolRegistry

SYSTEM_PROMPT = """你是 RetainPDF 图书馆的文献问答助手。用户的库里是科学文献(原文多为英文,已翻译为中文)。

工作方式:
- 先用工具找证据,再回答;不要凭空回答文献内容。可以多轮使用工具、更换关键词反复检索。
- 每条检索命中都带一个引用编号 [n]。回答中的事实陈述必须标注来源编号,例如:该方法的计算量显著降低 [2]。
- 找不到证据就直说没找到,不要编造。
- 用中文回答,术语保留原文。回答做到简洁、直接。"""

CITATION_RE = re.compile(r"\[(\d+)\]")


@dataclass
class Citation:
    ref: int
    document_id: str
    job_id: str
    page_idx: int
    block_id: str
    snippet: str


@dataclass
class AskResult:
    answer: str
    citations: list[Citation] = field(default_factory=list)
    tool_trace: list[dict[str, Any]] = field(default_factory=list)
    rounds: int = 0


ChatFn = Callable[[list[dict[str, Any]], list[dict[str, Any]]], dict[str, Any]]


def build_deepseek_chat_fn(settings: Settings, client: httpx.Client | None = None) -> ChatFn:
    http = client or httpx.Client(timeout=settings.llm_timeout_s)

    def chat(messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]:
        response = http.post(
            f"{settings.llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": messages,
                "tools": tools,
                "temperature": 0.2,
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]

    return chat


class RetrievalAgent:
    def __init__(
        self,
        registry: ToolRegistry,
        chat_fn: ChatFn,
        *,
        max_tool_rounds: int = 6,
    ) -> None:
        self._registry = registry
        self._chat = chat_fn
        self._max_tool_rounds = max(1, max_tool_rounds)

    def ask(self, question: str, *, document_id: str = "") -> AskResult:
        user_content = question.strip()
        if document_id:
            user_content = f"(限定文档 document_id={document_id})\n{user_content}"
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]
        citations: dict[int, Citation] = {}
        trace: list[dict[str, Any]] = []
        next_ref = 1

        for round_index in range(1, self._max_tool_rounds + 1):
            message = self._chat(messages, self._registry.specs())
            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                answer = str(message.get("content") or "").strip()
                return AskResult(
                    answer=answer,
                    citations=_referenced_citations(answer, citations),
                    tool_trace=trace,
                    rounds=round_index,
                )
            messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )
            for call in tool_calls:
                name = call.get("function", {}).get("name", "")
                try:
                    arguments = json.loads(call.get("function", {}).get("arguments") or "{}")
                except json.JSONDecodeError:
                    arguments = {}
                result = self._registry.invoke(name, arguments)
                next_ref = _assign_refs(result, citations, next_ref)
                trace.append({"round": round_index, "tool": name, "arguments": arguments})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", ""),
                        "content": json.dumps(result, ensure_ascii=False),
                    }
                )

        # 轮数耗尽:强制模型基于已有证据收尾(不给工具)
        messages.append(
            {
                "role": "user",
                "content": "请基于以上已检索到的证据直接给出最终回答,不要再调用工具。",
            }
        )
        message = self._chat(messages, [])
        answer = str(message.get("content") or "").strip()
        return AskResult(
            answer=answer,
            citations=_referenced_citations(answer, citations),
            tool_trace=trace,
            rounds=self._max_tool_rounds,
        )


def _assign_refs(result: dict[str, Any], citations: dict[int, Citation], next_ref: int) -> int:
    """给带锚点的工具结果编引用号,并把编号写回结果供模型引用。"""
    anchored: list[dict[str, Any]] = []
    anchored.extend(result.get("hits") or [])
    anchored.extend(result.get("favorites") or [])
    for block in result.get("blocks") or []:
        # read_blocks 的块继承外层锚点
        block = dict(block)
        block.setdefault("document_id", result.get("document_id"))
        block.setdefault("job_id", result.get("job_id"))
        block.setdefault("page_idx", result.get("page_idx"))
        anchored.append(block)
    for entry in anchored:
        if not isinstance(entry, dict):
            continue
        document_id = str(entry.get("document_id") or "")
        block_id = str(entry.get("block_id") or "")
        if not document_id or not block_id:
            continue
        entry["ref"] = next_ref
        snippet = str(
            entry.get("translated_snippet")
            or entry.get("translated_text")
            or entry.get("translated_quote_text")
            or entry.get("source_snippet")
            or entry.get("source_text")
            or entry.get("quote_text")
            or ""
        )
        citations[next_ref] = Citation(
            ref=next_ref,
            document_id=document_id,
            job_id=str(entry.get("job_id") or ""),
            page_idx=int(entry.get("page_idx") or 0),
            block_id=block_id,
            snippet=snippet[:200],
        )
        next_ref += 1
    return next_ref


def _referenced_citations(answer: str, citations: dict[int, Citation]) -> list[Citation]:
    referenced = {int(match) for match in CITATION_RE.findall(answer)}
    selected = [citations[ref] for ref in sorted(referenced) if ref in citations]
    # 模型没标注编号时,退回给出全部证据(宁可多给锚点也不丢溯源)
    if not selected and citations:
        return [citations[ref] for ref in sorted(citations)][:10]
    return selected
