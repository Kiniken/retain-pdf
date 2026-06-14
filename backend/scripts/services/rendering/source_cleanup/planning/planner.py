from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import fitz

from services.rendering.contracts import RenderDocumentAnalysis
from services.rendering.source_cleanup.planning.accumulator import BBoxTextStripCandidateAccumulator
from services.rendering.source_cleanup.planning.geometry import formula_guard_rects
from services.rendering.source_cleanup.planning.item_classifier import item_allows_item_cover_fallback
from services.rendering.source_cleanup.planning.items import iter_formula_item_rects_for_page
from services.rendering.source_cleanup.planning.items import iter_strip_item_rect_pairs_for_page
from services.rendering.source_cleanup.planning.items import iter_strip_item_rects_for_page
from services.rendering.source_cleanup.planning.items import item_should_emit_strip_rect
from services.rendering.source_cleanup.planning.page_gate import bbox_text_strip_items_skip_reason
from services.rendering.source_cleanup.planning.rect_filter import rect_overlaps_any_unsafe_vector
from services.rendering.source_cleanup.planning.rects import merge_rects
from services.rendering.source_cleanup.planning.coordinate_resolver import PageBBoxResolver
from services.rendering.source_cleanup.planning.geometry import rect_tuple
from services.rendering.source_cleanup.planning.page_features import PageCleanupFeatures
from services.rendering.source_cleanup.planning.page_features import build_page_cleanup_features
from services.rendering.source_cleanup.pdf.constants import BBOX_TEXT_STRIP_CONTENT_STREAM_SIZE_THRESHOLD
from services.rendering.source_cleanup.types import BBOX_TEXT_STRIP_PAGE_SKIP_NONE
from services.rendering.source_cleanup.types import BBOX_TEXT_STRIP_PAGE_SKIP_COMPLEX
from services.rendering.source_cleanup.types import BBOX_TEXT_STRIP_PAGE_SKIP_NO_EFFECT
from services.rendering.source_cleanup.types import BBOX_TEXT_STRIP_PAGE_SKIP_NO_TEXT_OVERLAP
from services.rendering.source_cleanup.types import BBOX_TEXT_STRIP_PAGE_SKIP_VISUAL_BACKGROUND
from services.rendering.source_cleanup.types import BBoxTextStripCandidates
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_NOOP
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_PROTECT
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_EMITTED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_PROTECTED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_SKIPPED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STRIP
from services.rendering.source_cleanup.types import SourceCleanupDecision
from services.rendering.source_cleanup.planning.contracts import BBoxTextStripPagePlan
from services.rendering.source_cleanup.planning.segments import strip_segments_for_text_rect
from services.rendering.source_cleanup.planning.intent_classifier import classify_source_cleanup_intent
from services.rendering.source_cleanup.planning.coordinate_resolver import raw_bbox_rect


@dataclass(frozen=True)
class SourceCleanupPageContext:
    page: fitz.Page
    translated_items: list[dict]
    protected_items: list[dict]
    features: PageCleanupFeatures
    strip_items: list[dict]
    resolver: PageBBoxResolver | None = None
    strip_pairs: tuple = ()
    formula_rects: tuple[fitz.Rect, ...] = ()
    source_protected_rects: tuple[fitz.Rect, ...] = ()
    item_view_rects: tuple[fitz.Rect, ...] = ()

    @classmethod
    def build(
        cls,
        doc: fitz.Document,
        page: fitz.Page,
        *,
        translated_items: list[dict],
        protected_items: list[dict] | None = None,
        features: PageCleanupFeatures | None = None,
        build_geometry: bool,
    ) -> "SourceCleanupPageContext":
        strip_items = [item for item in translated_items if item_should_emit_strip_rect(item)]
        page_features = features or build_page_cleanup_features(doc, page)
        if not build_geometry or not strip_items:
            return cls(
                page=page,
                translated_items=translated_items,
                protected_items=protected_items or [],
                features=page_features,
                strip_items=strip_items,
            )
        resolver = PageBBoxResolver.build(page, items=translated_items + (protected_items or []))
        strip_pairs = tuple(iter_strip_item_rect_pairs_for_page(page, strip_items, resolver=resolver, prefiltered=True))
        formula_rects = tuple(
            rect for _item, rect in iter_formula_item_rects_for_page(page, translated_items, resolver=resolver)
        )
        source_protected_rects = tuple(
            rect for _item, rect in iter_protected_item_rects_for_page(page, protected_items or [], resolver=resolver)
        )
        item_view_rects = tuple(merge_rects([pair.view_rect for pair in strip_pairs if not pair.view_rect.is_empty]))
        return cls(
            page=page,
            translated_items=translated_items,
            protected_items=protected_items or [],
            features=page_features,
            strip_items=strip_items,
            resolver=resolver,
            strip_pairs=strip_pairs,
            formula_rects=formula_rects,
            source_protected_rects=source_protected_rects,
            item_view_rects=item_view_rects,
        )


def plan_source_cleanup(
    *,
    source_pdf_path: Path,
    translated_pages: dict[int, list[dict]],
    protected_pages: dict[int, list[dict]] | None = None,
    skip_formula_pages: bool = False,
    skip_form_xobject_pages: bool = True,
    document_analysis: RenderDocumentAnalysis | None = None,
) -> BBoxTextStripCandidates:
    accumulator = BBoxTextStripCandidateAccumulator()
    doc = fitz.open(source_pdf_path)
    try:
        protected_pages = protected_pages or {}
        for page_idx, items in translated_pages.items():
            if page_idx < 0 or page_idx >= len(doc):
                continue
            page = doc[page_idx]
            features = build_page_cleanup_features(doc, page)
            accumulator.add_page_features(page_idx, features)
            page_plan = plan_source_cleanup_page(
                doc,
                page,
                translated_items=items,
                protected_items=protected_pages.get(page_idx, []),
                skip_formula_pages=skip_formula_pages,
                skip_form_xobject_pages=skip_form_xobject_pages,
                features=features,
                document_analysis=document_analysis,
            )
            accumulator.add_page_plan(page_idx, page_plan)
    finally:
        doc.close()
    return accumulator.build()


def plan_source_cleanup_page(
    doc: fitz.Document,
    page: fitz.Page,
    *,
    translated_items: list[dict],
    protected_items: list[dict] | None = None,
    skip_formula_pages: bool = False,
    skip_form_xobject_pages: bool = True,
    features: PageCleanupFeatures | None = None,
    document_analysis: RenderDocumentAnalysis | None = None,
) -> BBoxTextStripPagePlan:
    if document_analysis is not None:
        route = document_analysis.page(page.number)
        if route is not None and not route.allows_pikepdf_text_strip:
            return BBoxTextStripPagePlan(skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_VISUAL_BACKGROUND)
    items_skip_reason = bbox_text_strip_items_skip_reason(
        translated_items,
        skip_formula_pages=skip_formula_pages,
    )
    if items_skip_reason != BBOX_TEXT_STRIP_PAGE_SKIP_NONE:
        return BBoxTextStripPagePlan(skip_reason=items_skip_reason)
    context = SourceCleanupPageContext.build(
        doc,
        page,
        translated_items=translated_items,
        protected_items=protected_items,
        features=features,
        build_geometry=False,
    )
    if not context.strip_items:
        decision_context = SourceCleanupPageContext.build(
            doc,
            page,
            translated_items=translated_items,
            protected_items=protected_items,
            features=context.features,
            build_geometry=True,
        )
        decisions = [
            *build_protected_decisions(decision_context),
            *build_noop_decisions(decision_context, []),
        ]
        return BBoxTextStripPagePlan(decisions=tuple(decisions))
    if context.features.content_stream_size >= BBOX_TEXT_STRIP_CONTENT_STREAM_SIZE_THRESHOLD:
        return BBoxTextStripPagePlan(skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_COMPLEX)
    if skip_form_xobject_pages and context.features.has_form_xobjects:
        return _plan_form_xobject_page(
            page,
            translated_items=context.translated_items,
            strip_items=context.strip_items,
            protected_items=context.protected_items,
            features=context.features,
        )
    return _plan_regular_page(
        SourceCleanupPageContext.build(
            doc,
            page,
            translated_items=translated_items,
            protected_items=protected_items,
            features=context.features,
            build_geometry=True,
        )
    )


def _plan_regular_page(context: SourceCleanupPageContext) -> BBoxTextStripPagePlan:
    if context.resolver is None:
        return BBoxTextStripPagePlan()
    strip_decisions = build_strip_decisions(context)
    decisions = [
        *strip_decisions,
        *build_protected_decisions(context),
        *build_noop_decisions(context, strip_decisions),
    ]
    strip_view_rects = tuple(
        fitz.Rect(decision.view_rect)
        for decision in strip_decisions
        if decision.view_rect is not None and decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
    )
    if not strip_view_rects:
        return BBoxTextStripPagePlan(
            skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_NO_EFFECT,
            decisions=tuple(decisions),
        )
    if not context.resolver.text_index.overlaps_any(strip_view_rects):
        return BBoxTextStripPagePlan(
            skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_NO_TEXT_OVERLAP,
            decisions=tuple(decisions),
        )
    if context.resolver.has_large_background_image():
        return BBoxTextStripPagePlan(
            skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_VISUAL_BACKGROUND,
            decisions=tuple(decisions),
        )

    formula_rects = list(context.formula_rects)
    source_protected_rects = list(context.source_protected_rects)
    source_strip_rects = merge_rects(
        fitz.Rect(decision.pdf_rect)
        for decision in strip_decisions
        if decision.pdf_rect is not None and decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
    )
    strip_rects = merge_rects(
        fitz.Rect(rect)
        for decision in strip_decisions
        if decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
        for rect in decision.strip_rects
    )
    if not strip_rects:
        return BBoxTextStripPagePlan(
            skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_NO_EFFECT,
            decisions=tuple(decisions),
        )
    protected_rects = merge_rects(
        [
            *build_formula_guard_rects(formula_rects, strip_rects=source_strip_rects),
            *source_protected_rects,
        ]
    )
    return BBoxTextStripPagePlan(
        strip_rects=tuple(strip_rects),
        protected_rects=tuple(protected_rects),
        uncovered_unsafe_vector_item_ids=uncovered_unsafe_vector_item_ids(
            context.strip_pairs,
            unsafe_rects=context.resolver.unsafe_vector_index,
        ),
        decisions=tuple(decisions),
    )


def build_page_strip_rects_for_page(
    page: fitz.Page,
    *,
    translated_items: list[dict],
) -> list[fitz.Rect]:
    protected_formula_rects = build_page_formula_rects_for_page(page, translated_items=translated_items)
    resolver = PageBBoxResolver.build(page, items=translated_items)
    strip_pairs = list(iter_strip_item_rect_pairs_for_page(page, translated_items, resolver=resolver))
    return _build_page_strip_rects_from_pairs(
        strip_pairs,
        formula_rects=protected_formula_rects,
        unsafe_rects=resolver.unsafe_vector_index,
    )


def _build_page_strip_rects_from_pairs(
    strip_pairs: list,
    *,
    formula_rects: list[fitz.Rect],
    unsafe_rects,
) -> list[fitz.Rect]:
    rects: list[fitz.Rect] = []
    for pair in strip_pairs:
        rects.extend(strip_segments_for_text_rect(pair.pdf_rect, formula_rects))
    return merge_rects(rects)


def _plan_form_xobject_page(
    page: fitz.Page,
    *,
    translated_items: list[dict],
    strip_items: list[dict],
    protected_items: list[dict] | None = None,
    features: PageCleanupFeatures | None = None,
) -> BBoxTextStripPagePlan:
    resolver = PageBBoxResolver.build(page, items=translated_items + (protected_items or []))
    strip_pairs = tuple(iter_strip_item_rect_pairs_for_page(page, strip_items, resolver=resolver, prefiltered=True))
    formula_rects = [rect for _item, rect in iter_formula_item_rects_for_page(page, translated_items, resolver=resolver)]
    context = SourceCleanupPageContext(
        page=page,
        translated_items=translated_items,
        protected_items=protected_items or [],
        features=features or PageCleanupFeatures(),
        strip_items=strip_items,
        resolver=resolver,
        strip_pairs=strip_pairs,
        formula_rects=tuple(formula_rects),
        source_protected_rects=tuple(
            rect for _item, rect in iter_protected_item_rects_for_page(page, protected_items or [], resolver=resolver)
        ),
    )
    strip_decisions = build_strip_decisions(context)
    decisions = [
        *strip_decisions,
        *build_protected_decisions(context),
        *build_noop_decisions(context, strip_decisions),
    ]
    source_strip_rects = [
        fitz.Rect(decision.pdf_rect)
        for decision in strip_decisions
        if decision.pdf_rect is not None and decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
    ]
    strip_rects = merge_rects(
        fitz.Rect(rect)
        for decision in strip_decisions
        if decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
        for rect in decision.strip_rects
    )
    if not strip_rects:
        return BBoxTextStripPagePlan(
            skip_reason=BBOX_TEXT_STRIP_PAGE_SKIP_NO_EFFECT,
            decisions=tuple(decisions),
        )
    protected_rects = merge_rects(
        [
            *build_formula_guard_rects(formula_rects, strip_rects=merge_rects(source_strip_rects)),
            *context.source_protected_rects,
        ]
    )
    return BBoxTextStripPagePlan(
        strip_rects=tuple(strip_rects),
        protected_rects=tuple(protected_rects),
        uncovered_unsafe_vector_item_ids=uncovered_unsafe_vector_item_ids(
            context.strip_pairs,
            unsafe_rects=resolver.unsafe_vector_index,
        ),
        decisions=tuple(decisions),
    )


def build_strip_decisions(context: SourceCleanupPageContext) -> list[SourceCleanupDecision]:
    if context.resolver is None:
        return []
    decisions: list[SourceCleanupDecision] = []
    for item in context.strip_items:
        decisions.append(strip_decision_for_item(context, item))
    return decisions


def strip_decision_for_item(context: SourceCleanupPageContext, item: dict) -> SourceCleanupDecision:
    assert context.resolver is not None
    intent = classify_source_cleanup_intent(item)
    resolution = context.resolver.coordinate_resolution_for_item(item)
    raw_rect = raw_bbox_rect(item.get("bbox", []))
    source_bbox = rect_tuple(raw_rect) if raw_rect is not None else None
    item_id = str(item.get("item_id") or item.get("block_id") or item.get("id") or "").strip()
    if not resolution.is_resolved:
        return SourceCleanupDecision(
            page_idx=int(context.page.number),
            item_id=item_id,
            action=SOURCE_CLEANUP_DECISION_STRIP,
            status=SOURCE_CLEANUP_DECISION_STATUS_SKIPPED,
            reason=resolution.reason,
            source_bbox=source_bbox,
            coordinate_confidence=resolution.score,
            cleanup_action=intent.cleanup_action,
            source_role=intent.source_role,
            translation_state=intent.translation_state,
            replacement_kind=intent.replacement_kind,
            **decision_role_payload(item),
        )
    pdf_rect = context.resolver.ocr_item_bbox_to_pdf_rect(item)
    view_rect = context.resolver.resolve_item_bbox_rect(item)
    if pdf_rect is None or view_rect is None:
        return SourceCleanupDecision(
            page_idx=int(context.page.number),
            item_id=item_id,
            action=SOURCE_CLEANUP_DECISION_STRIP,
            status=SOURCE_CLEANUP_DECISION_STATUS_SKIPPED,
            reason="missing_resolved_rect",
            source_bbox=source_bbox,
            coordinate_candidate=resolution.candidate.name if resolution.candidate is not None else "",
            coordinate_confidence=resolution.score,
            cleanup_action=intent.cleanup_action,
            source_role=intent.source_role,
            translation_state=intent.translation_state,
            replacement_kind=intent.replacement_kind,
            **decision_role_payload(item),
        )
    strip_rects = tuple(
        rect_tuple(segment)
        for segment in strip_segments_for_text_rect(pdf_rect, list(context.formula_rects))
    )
    if not strip_rects:
        status = SOURCE_CLEANUP_DECISION_STATUS_SKIPPED
        reason = "fully_protected_by_formula_guard"
    else:
        status = SOURCE_CLEANUP_DECISION_STATUS_EMITTED
        reason = resolution.reason
    return SourceCleanupDecision(
        page_idx=int(context.page.number),
        item_id=item_id,
        action=SOURCE_CLEANUP_DECISION_STRIP,
        status=status,
        reason=reason,
        source_bbox=source_bbox,
        view_rect=rect_tuple(view_rect),
        pdf_rect=rect_tuple(pdf_rect),
        strip_rects=strip_rects,
        coordinate_candidate=resolution.candidate.name if resolution.candidate is not None else "",
        coordinate_confidence=resolution.score,
        cleanup_action=intent.cleanup_action,
        source_role=intent.source_role,
        translation_state=intent.translation_state,
        replacement_kind=intent.replacement_kind,
        **decision_role_payload(item),
    )


def build_protected_decisions(context: SourceCleanupPageContext) -> list[SourceCleanupDecision]:
    if context.resolver is None:
        return []
    decisions: list[SourceCleanupDecision] = []
    protected_items = [
        item
        for item in context.translated_items
        if classify_source_cleanup_intent(item).should_protect_source
    ]
    protected_items.extend(context.protected_items)
    for item in protected_items:
        intent = classify_source_cleanup_intent(item)
        resolution = context.resolver.coordinate_resolution_for_item(item)
        raw_rect = raw_bbox_rect(item.get("bbox", []))
        pdf_rect = context.resolver.ocr_item_bbox_to_pdf_rect(item)
        view_rect = context.resolver.resolve_item_bbox_rect(item)
        protected_rects = (rect_tuple(pdf_rect),) if pdf_rect is not None else ()
        decisions.append(
            SourceCleanupDecision(
                page_idx=int(context.page.number),
                item_id=str(item.get("item_id") or item.get("block_id") or item.get("id") or "").strip(),
                action=SOURCE_CLEANUP_DECISION_PROTECT,
                status=SOURCE_CLEANUP_DECISION_STATUS_PROTECTED if protected_rects else SOURCE_CLEANUP_DECISION_STATUS_SKIPPED,
                reason=intent.reasons[0] if intent.reasons else "protect_source",
                source_bbox=rect_tuple(raw_rect) if raw_rect is not None else None,
                view_rect=rect_tuple(view_rect) if view_rect is not None else None,
                pdf_rect=rect_tuple(pdf_rect) if pdf_rect is not None else None,
                protected_rects=protected_rects,
                coordinate_candidate=resolution.candidate.name if resolution.candidate is not None else "",
                coordinate_confidence=resolution.score,
                cleanup_action=intent.cleanup_action,
                source_role=intent.source_role,
                translation_state=intent.translation_state,
                replacement_kind=intent.replacement_kind,
                **decision_role_payload(item),
            )
        )
    return decisions


def build_noop_decisions(
    context: SourceCleanupPageContext,
    strip_decisions: list[SourceCleanupDecision],
) -> list[SourceCleanupDecision]:
    strip_item_ids = {decision.item_id for decision in strip_decisions if decision.item_id}
    decisions: list[SourceCleanupDecision] = []
    for item in context.translated_items:
        item_id = str(item.get("item_id") or item.get("block_id") or item.get("id") or "").strip()
        if not item_id or item_id in strip_item_ids:
            continue
        intent = classify_source_cleanup_intent(item)
        if intent.should_protect_source:
            continue
        raw_rect = raw_bbox_rect(item.get("bbox", []))
        decisions.append(
            SourceCleanupDecision(
                page_idx=int(context.page.number),
                item_id=item_id,
                action=SOURCE_CLEANUP_DECISION_NOOP,
                status=SOURCE_CLEANUP_DECISION_STATUS_SKIPPED,
                reason=intent.reasons[0] if intent.reasons else "no_cleanup",
                source_bbox=rect_tuple(raw_rect) if raw_rect is not None else None,
                cleanup_action=intent.cleanup_action,
                source_role=intent.source_role,
                translation_state=intent.translation_state,
                replacement_kind=intent.replacement_kind,
                **decision_role_payload(item),
            )
        )
    return decisions


def decision_role_payload(item: dict) -> dict[str, str]:
    return {
        "layout_role": str(item.get("layout_role") or "").strip().lower(),
        "semantic_role": str(item.get("semantic_role") or "").strip().lower(),
        "normalized_sub_type": str(item.get("normalized_sub_type") or "").strip().lower(),
    }


def iter_protected_item_rects_for_page(
    page: fitz.Page,
    protected_items: list[dict],
    *,
    resolver: PageBBoxResolver | None = None,
):
    active_resolver = resolver or PageBBoxResolver.build(page, items=protected_items)
    for item in protected_items:
        rect = active_resolver.ocr_item_bbox_to_pdf_rect(item)
        if rect is not None:
            yield item, rect


def item_ids_with_uncovered_unsafe_vector_overlap(
    *,
    source_pdf_path: Path,
    translated_pages: dict[int, list[dict]],
) -> frozenset[str]:
    item_ids: set[str] = set()
    doc = fitz.open(source_pdf_path)
    try:
        for page_idx, items in translated_pages.items():
            if page_idx < 0 or page_idx >= len(doc):
                continue
            item_ids.update(page_uncovered_unsafe_vector_item_ids(doc[page_idx], items))
    finally:
        doc.close()
    return frozenset(item_ids)


def page_uncovered_unsafe_vector_item_ids(page: fitz.Page, translated_items: list[dict]) -> frozenset[str]:
    strip_items = [item for item in translated_items if item_should_emit_strip_rect(item)]
    if not strip_items:
        return frozenset()
    resolver = PageBBoxResolver.build(page, items=strip_items)
    return uncovered_unsafe_vector_item_ids(
        iter_strip_item_rect_pairs_for_page(page, strip_items, resolver=resolver, prefiltered=True),
        unsafe_rects=resolver.unsafe_vector_index,
    )


def uncovered_unsafe_vector_item_ids(strip_pairs, *, unsafe_rects) -> frozenset[str]:
    if not unsafe_rects.rects:
        return frozenset()
    item_ids: set[str] = set()
    for pair in strip_pairs:
        item_id = str(pair.item.get("item_id") or "").strip()
        if not item_id:
            continue
        if not item_allows_item_cover_fallback(pair.item):
            continue
        if pair_overlaps_unsafe_vector(pair, unsafe_rects):
            item_ids.add(item_id)
    return frozenset(item_ids)


def pair_overlaps_unsafe_vector(pair, unsafe_rects) -> bool:
    probe_rects = tuple(getattr(pair, "probe_rects", ()) or (pair.view_rect,))
    return any(rect_overlaps_any_unsafe_vector(rect, unsafe_rects) for rect in probe_rects)


def build_page_formula_rects_for_page(
    page: fitz.Page,
    *,
    translated_items: list[dict],
) -> list[fitz.Rect]:
    return [rect for _item, rect in iter_formula_item_rects_for_page(page, translated_items)]


def build_formula_guard_rects(
    formula_rects: list[fitz.Rect],
    *,
    strip_rects: list[fitz.Rect] | None = None,
) -> list[fitz.Rect]:
    return formula_guard_rects(formula_rects, strip_rects=strip_rects)


def build_page_strip_source_rects_for_page(page: fitz.Page, *, translated_items: list[dict]) -> list[fitz.Rect]:
    return merge_rects([rect for _item, rect in iter_strip_item_rects_for_page(page, translated_items)])
