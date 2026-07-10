"""工具注册表:name + JSON Schema + handler 的标准形状。

约定与主流 agent 框架同构——将来若迁移到某个 SDK,工具定义原样搬走,
只换循环外壳。每个工具返回可 JSON 序列化的 dict;检索类结果统一带
(document_id, job_id, page_idx, block_id) 锚点,并由 agent 层编号成
可引用的 ref。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from .blocks import read_page_blocks
from .config import Settings
from .rust_client import RustApiClient


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[[dict[str, Any]], dict[str, Any]]

    def as_openai_tool(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    def __init__(self, tools: list[Tool]) -> None:
        self._tools = {tool.name: tool for tool in tools}

    def specs(self) -> list[dict[str, Any]]:
        return [tool.as_openai_tool() for tool in self._tools.values()]

    def invoke(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        tool = self._tools.get(name)
        if tool is None:
            return {"error": f"unknown tool: {name}"}
        try:
            return tool.handler(arguments)
        except Exception as exc:  # 工具失败作为结果反馈给模型,不中断循环
            return {"error": f"{type(exc).__name__}: {exc}"}


def build_default_registry(settings: Settings, rust: RustApiClient) -> ToolRegistry:
    def search_fulltext(arguments: dict[str, Any]) -> dict[str, Any]:
        query = str(arguments.get("query") or "").strip()
        if not query:
            return {"error": "query must not be empty"}
        limit = int(arguments.get("limit") or 10)
        hits = rust.search_fulltext(query, limit=max(1, min(limit, 30)))
        return {"hits": hits}

    def list_documents(arguments: dict[str, Any]) -> dict[str, Any]:
        documents = rust.list_documents(
            tag=str(arguments.get("tag") or ""),
            reading_status=str(arguments.get("reading_status") or ""),
            limit=int(arguments.get("limit") or 50),
        )
        # 只回模型需要的字段,别把整条记录灌进上下文
        return {
            "documents": [
                {
                    "document_id": document.get("document_id"),
                    "title": document.get("title"),
                    "page_count": document.get("page_count"),
                    "tags": document.get("tags"),
                    "reading_status": document.get("reading_status"),
                }
                for document in documents
            ]
        }

    def read_blocks(arguments: dict[str, Any]) -> dict[str, Any]:
        document_id = str(arguments.get("document_id") or "").strip()
        page_idx = arguments.get("page_idx")
        if not document_id or page_idx is None:
            return {"error": "document_id and page_idx are required"}
        document = rust.get_document(document_id)
        job_id = str(document.get("active_job_id") or "")
        if not job_id:
            return {"error": f"document {document_id} has no active job"}
        job_root = settings.data_root / "jobs" / job_id
        blocks = read_page_blocks(
            job_root,
            int(page_idx),
            around_block_id=str(arguments.get("around_block_id") or ""),
            max_blocks=int(arguments.get("max_blocks") or 12),
        )
        return {
            "document_id": document_id,
            "job_id": job_id,
            "page_idx": int(page_idx),
            "blocks": [
                {
                    "block_id": block.block_id,
                    "source_text": block.source_text[:600],
                    "translated_text": block.translated_text[:600],
                }
                for block in blocks
            ],
        }

    def search_favorites(arguments: dict[str, Any]) -> dict[str, Any]:
        keyword = str(arguments.get("keyword") or "").strip().lower()
        favorites = rust.list_favorites(str(arguments.get("document_id") or ""))
        if keyword:
            favorites = [
                favorite
                for favorite in favorites
                if keyword in str(favorite.get("quote_text", "")).lower()
                or keyword in str(favorite.get("translated_quote_text", "")).lower()
                or keyword in str(favorite.get("note", "")).lower()
            ]
        return {
            "favorites": [
                {
                    "favorite_id": favorite.get("favorite_id"),
                    "document_id": favorite.get("document_id"),
                    "job_id": favorite.get("job_id"),
                    "page_idx": favorite.get("page_idx"),
                    "block_id": favorite.get("block_id"),
                    "kind": favorite.get("kind"),
                    "quote_text": favorite.get("quote_text"),
                    "translated_quote_text": favorite.get("translated_quote_text"),
                    "note": favorite.get("note"),
                }
                for favorite in favorites[:30]
            ]
        }

    return ToolRegistry(
        [
            Tool(
                name="list_documents",
                description="列出图书馆中的文档(标题、标签、阅读状态)。回答涉及'哪篇文档/我的库里'时先用它确认范围。",
                parameters={
                    "type": "object",
                    "properties": {
                        "tag": {"type": "string", "description": "按标签过滤,可选"},
                        "reading_status": {
                            "type": "string",
                            "enum": ["unread", "reading", "done"],
                            "description": "按阅读状态过滤,可选",
                        },
                        "limit": {"type": "integer", "minimum": 1, "maximum": 200},
                    },
                },
                handler=list_documents,
            ),
            Tool(
                name="search_fulltext",
                description="跨全部文档的全文检索(中英文均可),返回带 (document_id, job_id, page_idx, block_id) 锚点的命中片段。这是找证据的主要工具,可多次换关键词调用。",
                parameters={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "检索关键词或短语"},
                        "limit": {"type": "integer", "minimum": 1, "maximum": 30},
                    },
                    "required": ["query"],
                },
                handler=search_fulltext,
            ),
            Tool(
                name="read_blocks",
                description="读取某文档某页的原文与译文块。用于查看检索命中处的完整上下文(传 around_block_id 以命中块为中心取窗口)。",
                parameters={
                    "type": "object",
                    "properties": {
                        "document_id": {"type": "string"},
                        "page_idx": {"type": "integer", "minimum": 0},
                        "around_block_id": {"type": "string", "description": "以此块为中心取上下文,可选"},
                        "max_blocks": {"type": "integer", "minimum": 1, "maximum": 30},
                    },
                    "required": ["document_id", "page_idx"],
                },
                handler=read_blocks,
            ),
            Tool(
                name="search_favorites",
                description="检索用户收藏过的句子/数据(可按关键词与文档过滤)。问题涉及'我收藏的/我标记过的'内容时使用。",
                parameters={
                    "type": "object",
                    "properties": {
                        "keyword": {"type": "string", "description": "在引文与备注里做关键词过滤,可选"},
                        "document_id": {"type": "string", "description": "限定某文档,可选"},
                    },
                },
                handler=search_favorites,
            ),
        ]
    )
