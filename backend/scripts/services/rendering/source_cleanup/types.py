from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field
from pathlib import Path

import fitz


BBOX_TEXT_STRIP_PAGE_SKIP_NONE = "none"
BBOX_TEXT_STRIP_PAGE_SKIP_COMPLEX = "complex"
BBOX_TEXT_STRIP_PAGE_SKIP_NO_TEXT_OVERLAP = "no_text_overlap"
BBOX_TEXT_STRIP_PAGE_SKIP_VISUAL_BACKGROUND = "visual_background"
BBOX_TEXT_STRIP_PAGE_SKIP_NO_EFFECT = "strip_no_effect"
BBOX_TEXT_STRIP_CANDIDATE_SOURCE_FRESH_PLAN = "fresh_plan"
BBOX_TEXT_STRIP_CANDIDATE_SOURCE_MANIFEST = "manifest"

SOURCE_CLEANUP_DECISION_STRIP = "strip"
SOURCE_CLEANUP_DECISION_PROTECT = "protect"
SOURCE_CLEANUP_DECISION_NOOP = "noop"

SOURCE_CLEANUP_DECISION_STATUS_EMITTED = "emitted"
SOURCE_CLEANUP_DECISION_STATUS_PROTECTED = "protected"
SOURCE_CLEANUP_DECISION_STATUS_SKIPPED = "skipped"


@dataclass(frozen=True)
class BBoxTextStripResult:
    changed: bool
    output_pdf_path: Path | None = None
    pages_changed: int = 0
    text_show_ops_removed: int = 0
    pages_skipped_complex: int = 0
    pages_skipped_no_text_overlap: int = 0
    pages_skipped_visual_background: int = 0
    pages_skipped_form_xobject: int = 0
    pages_strip_no_effect: int = 0
    forms_changed: int = 0
    changed_page_indices: frozenset[int] = frozenset()
    skipped_complex_page_indices: frozenset[int] = frozenset()
    skipped_no_text_overlap_page_indices: frozenset[int] = frozenset()
    skipped_visual_background_page_indices: frozenset[int] = frozenset()
    skipped_form_xobject_page_indices: frozenset[int] = frozenset()
    strip_no_effect_page_indices: frozenset[int] = frozenset()
    candidates: BBoxTextStripCandidates | None = None


@dataclass(frozen=True)
class SourceCleanupDecision:
    page_idx: int
    item_id: str
    action: str
    status: str
    reason: str
    source_bbox: tuple[float, float, float, float] | None = None
    view_rect: tuple[float, float, float, float] | None = None
    pdf_rect: tuple[float, float, float, float] | None = None
    strip_rects: tuple[tuple[float, float, float, float], ...] = ()
    protected_rects: tuple[tuple[float, float, float, float], ...] = ()
    coordinate_candidate: str = ""
    coordinate_confidence: float | None = None
    cleanup_action: str = ""
    source_role: str = ""
    translation_state: str = ""
    replacement_kind: str = ""
    layout_role: str = ""
    semantic_role: str = ""
    normalized_sub_type: str = ""

    def to_manifest(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "page_idx": int(self.page_idx),
            "item_id": self.item_id,
            "action": self.action,
            "status": self.status,
            "reason": self.reason,
            "strip_rects": [list(rect) for rect in self.strip_rects],
            "protected_rects": [list(rect) for rect in self.protected_rects],
            "coordinate_candidate": self.coordinate_candidate,
            "cleanup_action": self.cleanup_action,
            "source_role": self.source_role,
            "translation_state": self.translation_state,
            "replacement_kind": self.replacement_kind,
            "layout_role": self.layout_role,
            "semantic_role": self.semantic_role,
            "normalized_sub_type": self.normalized_sub_type,
        }
        if self.source_bbox is not None:
            payload["source_bbox"] = list(self.source_bbox)
        if self.view_rect is not None:
            payload["view_rect"] = list(self.view_rect)
        if self.pdf_rect is not None:
            payload["pdf_rect"] = list(self.pdf_rect)
        if self.coordinate_confidence is not None:
            payload["coordinate_confidence"] = round(float(self.coordinate_confidence), 3)
        return payload

    @classmethod
    def from_manifest(cls, value: object) -> "SourceCleanupDecision | None":
        payload = dict(value or {})
        item_id = str(payload.get("item_id") or "").strip()
        action = str(payload.get("action") or "").strip()
        status = str(payload.get("status") or "").strip()
        reason = str(payload.get("reason") or "").strip()
        if not action or not status:
            return None
        return cls(
            page_idx=_int_or_zero(payload.get("page_idx")),
            item_id=item_id,
            action=action,
            status=status,
            reason=reason,
            source_bbox=_rect_tuple_from_manifest(payload.get("source_bbox")),
            view_rect=_rect_tuple_from_manifest(payload.get("view_rect")),
            pdf_rect=_rect_tuple_from_manifest(payload.get("pdf_rect")),
            strip_rects=_rect_tuple_list_from_manifest(payload.get("strip_rects")),
            protected_rects=_rect_tuple_list_from_manifest(payload.get("protected_rects")),
            coordinate_candidate=str(payload.get("coordinate_candidate") or ""),
            coordinate_confidence=_float_or_none(payload.get("coordinate_confidence")),
            cleanup_action=str(payload.get("cleanup_action") or ""),
            source_role=str(payload.get("source_role") or ""),
            translation_state=str(payload.get("translation_state") or ""),
            replacement_kind=str(payload.get("replacement_kind") or ""),
            layout_role=str(payload.get("layout_role") or ""),
            semantic_role=str(payload.get("semantic_role") or ""),
            normalized_sub_type=str(payload.get("normalized_sub_type") or ""),
        )


@dataclass(frozen=True)
class BBoxTextStripCandidates:
    page_rects: dict[int, tuple[tuple[float, float, float, float], ...]]
    page_protected_rects: dict[int, tuple[tuple[float, float, float, float], ...]] | None = None
    decisions: tuple[SourceCleanupDecision, ...] = ()
    uncovered_unsafe_vector_item_ids: frozenset[str] = frozenset()
    candidate_source: str = BBOX_TEXT_STRIP_CANDIDATE_SOURCE_FRESH_PLAN
    pages_skipped_complex: int = 0
    pages_skipped_no_text_overlap: int = 0
    pages_skipped_visual_background: int = 0
    pages_skipped_form_xobject: int = 0
    pages_strip_no_effect: int = 0
    skipped_complex_page_indices: frozenset[int] = frozenset()
    skipped_no_text_overlap_page_indices: frozenset[int] = frozenset()
    skipped_visual_background_page_indices: frozenset[int] = frozenset()
    skipped_form_xobject_page_indices: frozenset[int] = frozenset()
    strip_no_effect_page_indices: frozenset[int] = frozenset()
    page_features: dict[int, dict[str, object]] = field(default_factory=dict)

    def fitz_page_rects(self) -> dict[int, list[fitz.Rect]]:
        return {
            page_idx: [fitz.Rect(rect) for rect in rects]
            for page_idx, rects in self.page_rects.items()
        }

    def fitz_page_protected_rects(self) -> dict[int, list[fitz.Rect]]:
        return {
            page_idx: [fitz.Rect(rect) for rect in rects]
            for page_idx, rects in (self.page_protected_rects or {}).items()
        }


def _int_or_zero(value: object) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def _float_or_none(value: object) -> float | None:
    try:
        return float(value)
    except Exception:
        return None


def _rect_tuple_from_manifest(value: object) -> tuple[float, float, float, float] | None:
    if not isinstance(value, list) or len(value) != 4:
        return None
    try:
        return (float(value[0]), float(value[1]), float(value[2]), float(value[3]))
    except Exception:
        return None


def _rect_tuple_list_from_manifest(value: object) -> tuple[tuple[float, float, float, float], ...]:
    if not isinstance(value, list):
        return ()
    return tuple(
        rect
        for item in value
        if (rect := _rect_tuple_from_manifest(item)) is not None
    )
