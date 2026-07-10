"""FastAPI 应用:认证 + /v1/ask + 健康检查。"""

from __future__ import annotations

import json
import queue
import threading
from dataclasses import asdict
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
    stream: bool = False


def build_app(settings: Settings | None = None, agent: RetrievalAgent | None = None) -> FastAPI:
    settings = settings or load_settings()
    if agent is None:
        if not settings.llm_api_key:
            raise RuntimeError("RETAIN_AI_LLM_API_KEY is required")
        if not settings.rust_api_key:
            raise RuntimeError("RETAIN_AI_RUST_API_KEY is required")
        rust = RustApiClient(settings)
        agent = RetrievalAgent(
            build_default_registry(settings, rust),
            build_deepseek_chat_fn(settings),
            max_tool_rounds=settings.max_tool_rounds,
        )

    app = FastAPI(title="retainpdf-ai", version=__version__)

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

    def _sse_events(payload: AskInput) -> Iterator[str]:
        # agent 循环是同步阻塞的,放到工作线程,经队列推事件——
        # 前端在首个工具调用(~2s)就能看到"正在检索…"的过程感。
        events: queue.Queue[dict[str, Any] | None] = queue.Queue()

        def run() -> None:
            try:
                result = agent.ask(
                    payload.question,
                    document_id=payload.document_id,
                    on_event=events.put,
                )
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
            return StreamingResponse(
                _sse_events(payload),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            )
        result = agent.ask(payload.question, document_id=payload.document_id)
        return {"code": 0, "message": "ok", "data": _result_payload(result)}

    return app
