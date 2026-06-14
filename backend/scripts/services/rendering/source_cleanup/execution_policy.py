from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import fitz

from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_EMITTED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STRIP
from services.rendering.source_cleanup.types import SourceCleanupDecision


PATH_REMOVAL_SOURCE_ROLES = frozenset(
    {
        "caption",
        "figure_caption",
        "image_caption",
        "table_caption",
        "footnote",
        "table_footnote",
        "image_footnote",
        "vision_footnote",
        "metadata",
    }
)


@dataclass(frozen=True)
class PageCleanupExecutionPolicy:
    path_removal_rects: tuple[fitz.Rect, ...] = ()

    @property
    def allows_path_removal(self) -> bool:
        return bool(self.path_removal_rects)


def build_page_execution_policies(
    decisions: Iterable[SourceCleanupDecision],
) -> dict[int, PageCleanupExecutionPolicy]:
    path_rects_by_page: dict[int, list[fitz.Rect]] = {}
    for decision in decisions:
        if not decision_allows_path_removal(decision):
            continue
        rects = path_rects_by_page.setdefault(decision.page_idx, [])
        rects.extend(fitz.Rect(rect) for rect in decision.strip_rects)
    return {
        page_idx: PageCleanupExecutionPolicy(path_removal_rects=tuple(rects))
        for page_idx, rects in path_rects_by_page.items()
        if rects
    }


def decision_allows_path_removal(decision: SourceCleanupDecision) -> bool:
    return (
        decision.action == SOURCE_CLEANUP_DECISION_STRIP
        and decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
        and bool(decision.strip_rects)
        and _decision_role_values(decision) & PATH_REMOVAL_SOURCE_ROLES
    )


def _decision_role_values(decision: SourceCleanupDecision) -> frozenset[str]:
    return frozenset(
        value
        for value in (
            str(decision.source_role or "").strip().lower(),
            str(decision.layout_role or "").strip().lower(),
            str(decision.semantic_role or "").strip().lower(),
            str(decision.normalized_sub_type or "").strip().lower(),
            str(decision.replacement_kind or "").strip().lower(),
        )
        if value
    )


__all__ = [
    "PageCleanupExecutionPolicy",
    "build_page_execution_policies",
    "decision_allows_path_removal",
]
