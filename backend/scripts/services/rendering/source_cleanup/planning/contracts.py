from __future__ import annotations

from dataclasses import dataclass

import fitz

from services.rendering.source_cleanup.types import BBOX_TEXT_STRIP_PAGE_SKIP_NONE
from services.rendering.source_cleanup.types import SourceCleanupDecision


@dataclass(frozen=True)
class BBoxTextStripPagePlan:
    strip_rects: tuple[fitz.Rect, ...] = ()
    protected_rects: tuple[fitz.Rect, ...] = ()
    skip_reason: str = BBOX_TEXT_STRIP_PAGE_SKIP_NONE
    uncovered_unsafe_vector_item_ids: frozenset[str] = frozenset()
    decisions: tuple[SourceCleanupDecision, ...] = ()
