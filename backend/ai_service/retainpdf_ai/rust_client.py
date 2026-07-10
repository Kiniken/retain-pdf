"""Rust API 客户端:数据面只归 Rust 管,本服务经 HTTP 读。"""

from __future__ import annotations

from typing import Any

import httpx

from .config import Settings


class RustApiClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self._base = settings.rust_api_base
        self._client = client or httpx.Client(
            timeout=10.0,
            headers={"X-API-Key": settings.rust_api_key},
        )

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        response = self._client.get(f"{self._base}{path}", params=params or {})
        response.raise_for_status()
        payload = response.json()
        if payload.get("code") != 0:
            raise RuntimeError(f"rust api error on {path}: {payload.get('message')}")
        return payload.get("data") or {}

    def search_fulltext(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        data = self._get("/api/v1/search", {"q": query, "limit": limit})
        return list(data.get("hits") or [])

    def list_documents(
        self,
        *,
        tag: str = "",
        reading_status: str = "",
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit}
        if tag:
            params["tag"] = tag
        if reading_status:
            params["reading_status"] = reading_status
        data = self._get("/api/v1/documents", params)
        return list(data.get("documents") or [])

    def get_document(self, document_id: str) -> dict[str, Any]:
        return self._get(f"/api/v1/documents/{document_id}")

    def list_favorites(self, document_id: str = "") -> list[dict[str, Any]]:
        params = {"document_id": document_id} if document_id else None
        data = self._get("/api/v1/favorites", params)
        return list(data.get("favorites") or [])
