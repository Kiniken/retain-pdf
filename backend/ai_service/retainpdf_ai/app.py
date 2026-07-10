"""FastAPI 应用:认证 + /v1/ask + 健康检查。"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from . import __version__
from .agent import RetrievalAgent, build_deepseek_chat_fn
from .config import Settings, load_settings
from .rust_client import RustApiClient
from .tools import build_default_registry


class AskInput(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    document_id: str = ""


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

    @app.post("/v1/ask", dependencies=[Depends(require_api_key)])
    def ask(payload: AskInput) -> dict[str, Any]:
        result = agent.ask(payload.question, document_id=payload.document_id)
        return {
            "code": 0,
            "message": "ok",
            "data": {
                "answer": result.answer,
                "citations": [asdict(citation) for citation in result.citations],
                "tool_trace": result.tool_trace,
                "rounds": result.rounds,
            },
        }

    return app
