from __future__ import annotations

import json
from pathlib import Path

import fitz

from services.document_schema.consumer_reader import block_bbox
from services.document_schema.consumer_reader import block_kind
from services.document_schema.consumer_reader import block_policy_translate
from services.document_schema.consumer_reader import block_text
from services.document_schema.consumer_reader import get_pages
from services.rendering.source_cleanup.planning.coordinate_resolver import raw_bbox_rect
from services.rendering.source_cleanup.planning.items import item_should_emit_strip_rect
from services.rendering.source.rects import rect_area


MIN_TRANSLATED_OWNER_OVERLAP_RATIO = 0.35
MIN_TRANSLATED_OWNER_OVERLAP_AREA_PT2 = 4.0


def protected_pages_from_document_path(
    document_path: Path | None,
    *,
    translated_pages: dict[int, list[dict]] | None = None,
) -> dict[int, list[dict]]:
    if document_path is None or not Path(document_path).exists():
        return {}
    try:
        data = json.loads(Path(document_path).read_text(encoding="utf-8"))
    except Exception:
        return {}
    return protected_pages_from_document(data, translated_pages=translated_pages)


def protected_pages_from_document(
    data: dict,
    *,
    translated_pages: dict[int, list[dict]] | None = None,
) -> dict[int, list[dict]]:
    protected_pages: dict[int, list[dict]] = {}
    translated_owner_index = TranslatedOwnerIndex.build(translated_pages or {})
    for page in get_pages(data):
        page_index = int(page.get("page_index", page.get("page", 1) - 1) or 0)
        protected_items = [
            protected_item_from_block(block)
            for block in page.get("blocks", []) or []
            if block_should_protect_source(block)
            and not translated_owner_index.page_owns_block(page_index, block)
        ]
        protected_items = [item for item in protected_items if item is not None]
        if protected_items:
            protected_pages[page_index] = protected_items
    return protected_pages


def block_should_protect_source(block: dict) -> bool:
    if block_kind(block) != "text":
        return False
    if block_policy_translate(block) is not False:
        return False
    bbox = block_bbox(block)
    if len(bbox) != 4 or all(float(value or 0.0) == 0.0 for value in bbox):
        return False
    return bool(block_text(block).strip())


def protected_item_from_block(block: dict) -> dict | None:
    bbox = block_bbox(block)
    if len(bbox) != 4:
        return None
    return {
        "item_id": str(block.get("block_id") or ""),
        "block_kind": "text",
        "block_type": "text",
        "bbox": bbox,
        "source_text": block_text(block),
        "protected_source_text": block_text(block),
        "final_status": "kept_origin",
    }


class TranslatedOwnerIndex:
    def __init__(self, rects_by_page: dict[int, tuple[fitz.Rect, ...]]) -> None:
        self._rects_by_page = rects_by_page

    @classmethod
    def build(cls, translated_pages: dict[int, list[dict]]) -> "TranslatedOwnerIndex":
        rects_by_page: dict[int, tuple[fitz.Rect, ...]] = {}
        for page_idx, items in translated_pages.items():
            rects = tuple(
                rect
                for item in items
                if item_should_emit_strip_rect(item)
                if (rect := raw_bbox_rect(item.get("bbox", []))) is not None
            )
            if rects:
                rects_by_page[int(page_idx)] = rects
        return cls(rects_by_page)

    def page_owns_block(self, page_idx: int, block: dict) -> bool:
        rect = raw_bbox_rect(block_bbox(block))
        if rect is None:
            return False
        block_area = max(rect_area(rect), 0.001)
        for owner_rect in self._rects_by_page.get(int(page_idx), ()):
            overlap_area = rect_area(rect & owner_rect)
            if overlap_area < MIN_TRANSLATED_OWNER_OVERLAP_AREA_PT2:
                continue
            if overlap_area / block_area >= MIN_TRANSLATED_OWNER_OVERLAP_RATIO:
                return True
        return False


__all__ = [
    "TranslatedOwnerIndex",
    "block_should_protect_source",
    "protected_pages_from_document",
    "protected_pages_from_document_path",
]
