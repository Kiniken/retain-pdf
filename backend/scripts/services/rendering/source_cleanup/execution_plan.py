from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import fitz

from services.rendering.source_cleanup.execution_policy import PageCleanupExecutionPolicy
from services.rendering.source_cleanup.execution_policy import build_page_execution_policies
from services.rendering.source_cleanup.types import BBoxTextStripCandidates
from services.rendering.source_cleanup.types import BBoxTextStripResult


@dataclass(frozen=True)
class BBoxTextStripExecutionPlan:
    source_pdf_path: Path
    output_pdf_path: Path
    page_rects: dict[int, list[fitz.Rect]]
    page_protected_rects: dict[int, list[fitz.Rect]]
    page_execution_policies: dict[int, PageCleanupExecutionPolicy]
    candidates: BBoxTextStripCandidates
    candidate_elapsed: float = 0.0

    @property
    def has_work(self) -> bool:
        return bool(self.page_rects)

    @property
    def attempted_page_indices(self) -> frozenset[int]:
        return frozenset(self.page_rects)


def build_bbox_text_strip_execution_plan(
    *,
    source_pdf_path: Path,
    output_pdf_path: Path,
    candidates: BBoxTextStripCandidates,
    candidate_elapsed: float = 0.0,
) -> BBoxTextStripExecutionPlan:
    page_execution_policies = build_page_execution_policies(candidates.decisions)
    if candidates.decisions:
        page_execution_policies = {
            page_idx: page_execution_policies.get(page_idx, PageCleanupExecutionPolicy())
            for page_idx in candidates.page_rects
        }
    return BBoxTextStripExecutionPlan(
        source_pdf_path=source_pdf_path,
        output_pdf_path=output_pdf_path,
        page_rects=candidates.fitz_page_rects(),
        page_protected_rects=candidates.fitz_page_protected_rects(),
        page_execution_policies=page_execution_policies,
        candidates=candidates,
        candidate_elapsed=candidate_elapsed,
    )


def empty_result_from_execution_plan(plan: BBoxTextStripExecutionPlan) -> BBoxTextStripResult:
    candidates = plan.candidates
    return BBoxTextStripResult(
        changed=False,
        candidates=candidates,
        pages_skipped_complex=candidates.pages_skipped_complex,
        pages_skipped_no_text_overlap=candidates.pages_skipped_no_text_overlap,
        pages_skipped_visual_background=candidates.pages_skipped_visual_background,
        pages_skipped_form_xobject=len(candidates.skipped_form_xobject_page_indices),
        pages_strip_no_effect=len(candidates.strip_no_effect_page_indices),
        skipped_complex_page_indices=frozenset(candidates.skipped_complex_page_indices),
        skipped_no_text_overlap_page_indices=frozenset(candidates.skipped_no_text_overlap_page_indices),
        skipped_visual_background_page_indices=frozenset(candidates.skipped_visual_background_page_indices),
        skipped_form_xobject_page_indices=frozenset(candidates.skipped_form_xobject_page_indices),
        strip_no_effect_page_indices=frozenset(candidates.strip_no_effect_page_indices),
    )
