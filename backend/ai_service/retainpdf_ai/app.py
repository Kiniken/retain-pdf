"""FastAPI 应用:认证 + /v1/ask + 健康检查。"""

from __future__ import annotations

import json
import queue
import threading
from dataclasses import asdict, replace
from typing import Any, Iterator

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import __version__
from .agent import RetrievalAgent, build_deepseek_chat_fn
from .config import Settings, load_settings
from .rust_client import RustApiClient
from .tools import build_default_registry


class AskInput(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    document_id: str = ""
    # 可只传 job_id(含历史 run):由服务端解析所属文档,避免前端靠
    # active_job_id 反查在历史 job 上静默失配、问答退化为全库检索
    job_id: str = ""
    # 多轮对话:传会话 ID 则注入既往轮次为上下文,并在完成后把
    # user/assistant 两条经 Rust API 回写(单写入者不破)
    conversation_id: str = ""
    stream: bool = False
    # 前端按请求传入的 LLM 凭据:留空则回退启动期 env 配置
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""


def build_app(
    settings: Settings | None = None,
    agent: RetrievalAgent | None = None,
    rust: RustApiClient | None = None,
) -> FastAPI:
    settings = settings or load_settings()
    if agent is None:
        # LLM key 不再强制:允许留空 env,由前端按请求传入(见 AskInput.llm_api_key)
        if not settings.rust_api_key:
            raise RuntimeError("RETAIN_AI_RUST_API_KEY is required")
        rust = rust or RustApiClient(settings)
        agent = RetrievalAgent(
            build_default_registry(settings, rust),
            build_deepseek_chat_fn(settings),
            max_tool_rounds=settings.max_tool_rounds,
        )

    app = FastAPI(title="retainpdf-ai", version=__version__)

    def resolve_document_id(payload: AskInput) -> str:
        document_id = payload.document_id.strip()
        if document_id or not payload.job_id.strip() or rust is None:
            return document_id
        try:
            document = rust.get_document_by_job(payload.job_id.strip())
        except Exception:
            return ""
        return str((document or {}).get("document_id") or "")

    def load_history(payload: AskInput) -> list[dict[str, str]]:
        conversation_id = payload.conversation_id.strip()
        if not conversation_id or rust is None:
            return []
        try:
            detail = rust.get_conversation(conversation_id) or {}
        except Exception:
            return []
        messages = detail.get("messages") or []
        # 只取最近若干轮,控制上下文体积
        return [
            {"role": str(m.get("role") or ""), "content": str(m.get("content") or "")}
            for m in messages[-12:]
        ]

    def persist_turn(payload: AskInput, result: Any) -> None:
        """尽力而为的历史回写:失败只记日志,不影响返回。"""
        conversation_id = payload.conversation_id.strip()
        if not conversation_id or rust is None:
            return
        try:
            rust.append_conversation_message(
                conversation_id, role="user", content=payload.question.strip()
            )
            rust.append_conversation_message(
                conversation_id,
                role="assistant",
                content=result.answer,
                citations_json=json.dumps(
                    [asdict(citation) for citation in result.citations], ensure_ascii=False
                ),
                tool_trace_json=json.dumps(result.tool_trace, ensure_ascii=False),
                model=payload.llm_model or settings.llm_model,
            )
        except Exception as exc:
            print(f"[retainpdf-ai] persist conversation turn failed: {exc}", flush=True)

    def require_api_key(request: Request) -> None:
        if not settings.api_keys:
            raise HTTPException(status_code=500, detail="RETAIN_AI_API_KEYS is not configured")
        provided = request.headers.get("X-API-Key", "")
        if provided not in settings.api_keys:
            raise HTTPException(status_code=401, detail="invalid api key")

    @app.get("/healthz")
    def healthz() -> dict[str, Any]:
        return {"ok": True, "version": __version__}

    def _result_payload(result: Any) -> dict[str, Any]:
        return {
            "answer": result.answer,
            "citations": [asdict(citation) for citation in result.citations],
            "tool_trace": result.tool_trace,
            "rounds": result.rounds,
        }

    def _resolve_llm_settings(payload: AskInput) -> Settings:
        # 前端按请求携带 LLM key/base/model 时覆盖启动期配置;三者留空则回退 env。
        # 缺 key 直接报错,避免打到上游才 401。
        api_key = (payload.llm_api_key or settings.llm_api_key).strip()
        if not api_key:
            raise HTTPException(status_code=400, detail="缺少 LLM API Key:请在前端凭据设置中填写模型 API Key。")
        return replace(
            settings,
            llm_api_key=api_key,
            llm_base_url=(payload.llm_base_url or settings.llm_base_url).rstrip("/"),
            llm_model=payload.llm_model or settings.llm_model,
        )

    def _request_chat_fn(payload: AskInput):
        # 非流式路径:请求未覆盖任何 LLM 参数时回退启动期 chat_fn(返回 None)。
        resolved = _resolve_llm_settings(payload)  # 顺带做缺 key 守卫
        if not payload.llm_api_key and not payload.llm_base_url and not payload.llm_model:
            return None
        return build_deepseek_chat_fn(resolved)

    def _sse_events(payload: AskInput, resolved: Settings) -> Iterator[str]:
        # agent 循环是同步阻塞的,放到工作线程,经队列推事件——
        # 前端在首个工具调用(~2s)就能看到"正在检索…"的过程感;
        # 最终回答轮经 on_delta 逐 token 推 answer_delta。
        events: queue.Queue[dict[str, Any] | None] = queue.Queue()
        # SSE 路径总是用带 on_delta 的流式 chat_fn:增量文本进事件队列。
        chat_fn = build_deepseek_chat_fn(
            resolved,
            on_delta=lambda text: events.put({"type": "answer_delta", "text": text}),
        )

        def run() -> None:
            try:
                result = agent.ask(
                    payload.question,
                    document_id=resolve_document_id(payload),
                    on_event=events.put,
                    chat_fn=chat_fn,
                    history=load_history(payload),
                )
                persist_turn(payload, result)
                events.put({"type": "done", **_result_payload(result)})
            except Exception as exc:
                events.put({"type": "error", "message": f"{type(exc).__name__}: {exc}"})
            finally:
                events.put(None)

        threading.Thread(target=run, daemon=True).start()
        while True:
            event = events.get()
            if event is None:
                break
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    @app.post("/v1/ask", dependencies=[Depends(require_api_key)])
    def ask(payload: AskInput) -> Any:
        if payload.stream:
            # 生成器内抛 HTTPException 无法转成 400,故先在此校验并解析出 settings
            resolved = _resolve_llm_settings(payload)
            return StreamingResponse(
                _sse_events(payload, resolved),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            )
        chat_fn = _request_chat_fn(payload)
        result = agent.ask(
            payload.question,
            document_id=resolve_document_id(payload),
            chat_fn=chat_fn,
            history=load_history(payload),
        )
        persist_turn(payload, result)
        return {"code": 0, "message": "ok", "data": _result_payload(result)}

    return app
