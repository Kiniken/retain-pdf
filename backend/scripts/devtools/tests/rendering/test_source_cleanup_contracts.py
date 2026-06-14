from __future__ import annotations

import sys
from pathlib import Path

import fitz
import pytest


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from services.rendering.source.prewarm_manifest_io import bbox_candidates_from_manifest
from services.rendering.source.prewarm_manifest_io import bbox_candidates_to_manifest
from services.rendering.policy.cleanup_policy import item_render_output_text
from services.rendering.source_cleanup.execution_plan import build_bbox_text_strip_execution_plan
from services.rendering.source_cleanup.intents import SourceCleanupEvidence
from services.rendering.source_cleanup.planning.coordinate_resolver import BBOX_COORDINATE_CANDIDATES
from services.rendering.source_cleanup.planning.coordinate_resolver import PageBBoxResolver
from services.rendering.source_cleanup.planning.coordinate_resolver import raw_bbox_rect
from services.rendering.source_cleanup.planning.coordinate_resolver import score_item_coordinate_candidate
from services.rendering.source_cleanup.planning.intent_classifier import classify_source_cleanup_evidence
from services.rendering.source_cleanup.planning.intent_classifier import classify_source_cleanup_intent
from services.rendering.source_cleanup.planning.page_features import PageCleanupFeatures
from services.rendering.source_cleanup.planning.planner import plan_source_cleanup
from services.rendering.source_cleanup.planning.planner import plan_source_cleanup_page
from services.rendering.source_cleanup.types import BBoxTextStripCandidates
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_EMITTED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_SKIPPED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STRIP
from services.rendering.source_cleanup.types import SourceCleanupDecision


def test_source_cleanup_intent_preserves_textual_formula_without_overlay() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "formula",
            "block_type": "formula",
            "source_text": r"$$ \mathrm{f=lateral friction for design speed} $$",
        }
    )

    assert intent.source_role == "textual_formula"
    assert intent.cleanup_action == "protect_source"


def test_source_cleanup_intent_strips_textual_formula_with_overlay() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "formula",
            "block_type": "formula",
            "source_text": r"$$ \mathrm{f=lateral friction for design speed} $$",
            "protected_translated_text": "f = 设计速度对应的侧向摩擦系数",
        }
    )

    assert intent.source_role == "textual_formula"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_uses_evidence_textual_formula_contract() -> None:
    intent = classify_source_cleanup_evidence(
        SourceCleanupEvidence(
            item={},
            item_id="p001-b001",
            block_kind="formula",
            has_formula_region=True,
            is_textual_formula=True,
            source_text="",
            output_text="已翻译的文本型公式",
            is_marked_non_translated=False,
            has_unresolved_embedded_formula=False,
            is_force_strip_text=False,
        )
    )

    assert intent.source_role == "textual_formula"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_classifies_math_formula_as_protect_source() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "formula",
            "block_type": "formula",
            "source_text": r"$$ E=mc^2 $$",
        }
    )

    assert intent.source_role == "math_formula"
    assert intent.cleanup_action == "protect_source"


def test_source_cleanup_intent_preserves_mixed_text_with_display_formula() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": "body text\n$$ E=mc^2 $$",
            "protected_translated_text": "正文\n$$ E=mc^2 $$",
            "lines": [
                {"type": "text", "text": "body text"},
                {"type": "display_formula", "text": "$$ E=mc^2 $$"},
            ],
        }
    )

    assert intent.source_role == "mixed_math_text"
    assert intent.cleanup_action == "protect_source"


def test_source_cleanup_intent_keeps_inline_math_text_deletable() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": "Method-2: rate $ Ls=2.7V^2/R $",
            "protected_translated_text": "方法2：变化率 $ Ls=2.7V^2/R $",
        }
    )

    assert intent.source_role == "body_text"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_keeps_adjacent_inline_math_deletable() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": r"Sequences encoding ppaF, ss$\Delta$$\alpha$, or D$_{N}$$\alpha$F were amplified.",
            "protected_translated_text": r"扩增编码 ppaF、$ss\Delta\alpha$ 或 $D_{N}\alpha F$ 的序列。",
            "lines": [
                {
                    "spans": [
                        {"type": "text", "content": r"Sequences encoding ppaF, ss$"},
                        {"type": "inline_equation", "content": r"\Delta"},
                        {"type": "text", "content": r"$"},
                        {"type": "inline_equation", "content": r"\alpha"},
                        {"type": "text", "content": r"$, or D$"},
                        {"type": "inline_equation", "content": r"_{N}"},
                        {"type": "text", "content": r"$"},
                        {"type": "inline_equation", "content": r"\alpha"},
                        {"type": "text", "content": r"$F were amplified."},
                    ]
                }
            ],
        }
    )

    assert intent.source_role == "body_text"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_strips_table_footnote_with_inline_math_markers() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "layout_role": "footnote",
            "semantic_role": "metadata",
            "normalized_sub_type": "table_footnote",
            "source_text": "$ ^{a} $All calculations were performed with the def2-TZVP basis set. $ ^{54} $",
            "protected_translated_text": "$^{a}$所有计算均使用 def2-TZVP 基组完成。$^{54}$",
        }
    )

    assert intent.source_role == "body_text"
    assert intent.cleanup_action == "strip_text"


def test_source_cleanup_intent_keeps_marked_non_translated_text_even_with_output() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": "KEYWORDS: density functional theory",
            "protected_translated_text": "KEYWORDS: density functional theory",
            "tags": ["metadata", "skip_translation"],
        }
    )

    assert intent.translation_state == "kept_origin"
    assert intent.cleanup_action == "noop"


def test_source_cleanup_intent_keeps_same_source_and_output_text() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "source_text": "www.example.com",
            "protected_translated_text": "www.example.com",
        }
    )

    assert intent.translation_state == "kept_origin"
    assert intent.cleanup_action == "noop"


def test_bbox_text_strip_candidates_manifest_preserves_runtime_skip_metadata() -> None:
    candidates = BBoxTextStripCandidates(
        page_rects={1: ((10.0, 20.0, 30.0, 40.0),)},
        page_protected_rects={1: ((12.0, 22.0, 18.0, 28.0),)},
        decisions=(
            SourceCleanupDecision(
                page_idx=1,
                item_id="p002-b003",
                action=SOURCE_CLEANUP_DECISION_STRIP,
                status=SOURCE_CLEANUP_DECISION_STATUS_EMITTED,
                reason="source_text_match",
                source_bbox=(10.0, 20.0, 30.0, 40.0),
                view_rect=(10.0, 20.0, 30.0, 40.0),
                pdf_rect=(10.0, 20.0, 30.0, 40.0),
                strip_rects=((10.0, 20.0, 30.0, 40.0),),
                coordinate_candidate="raw_top_left",
                coordinate_confidence=0.95,
                cleanup_action="strip_text",
                source_role="body_text",
                translation_state="translated",
                replacement_kind="text_overlay",
            ),
        ),
        pages_skipped_complex=1,
        pages_skipped_form_xobject=2,
        pages_strip_no_effect=3,
        skipped_complex_page_indices=frozenset({4}),
        skipped_form_xobject_page_indices=frozenset({5, 6}),
        strip_no_effect_page_indices=frozenset({7, 8, 9}),
        page_features={1: {"content_stream_size": 1234, "has_form_xobjects": True}},
    )

    restored = bbox_candidates_from_manifest(bbox_candidates_to_manifest(candidates))

    assert restored is not None
    assert restored.page_rects == candidates.page_rects
    assert candidates.candidate_source == "fresh_plan"
    assert restored.candidate_source == "manifest"
    assert restored.skipped_form_xobject_page_indices == frozenset({5, 6})
    assert restored.strip_no_effect_page_indices == frozenset({7, 8, 9})
    assert restored.page_features[1]["content_stream_size"] == 1234
    assert len(restored.decisions) == 1
    assert restored.decisions[0].item_id == "p002-b003"
    assert restored.decisions[0].status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
    assert restored.decisions[0].strip_rects == ((10.0, 20.0, 30.0, 40.0),)


def test_bbox_text_strip_candidates_manifest_rejects_rects_without_decisions() -> None:
    restored = bbox_candidates_from_manifest(
        {
            "algorithm": "bbox_text_strip_v1",
            "page_rects": {"1": [[10.0, 20.0, 30.0, 40.0]]},
            "decisions": [],
        }
    )

    assert restored is None


def test_source_cleanup_output_text_uses_render_unit_translation_fields() -> None:
    item = {
        "item_id": "p001-b001",
        "block_kind": "text",
        "translation_unit_kind": "group",
        "translation_unit_protected_translated_text": "单元译文",
        "group_protected_translated_text": "组译文",
    }

    assert item_render_output_text(item) == "单元译文"


def test_bbox_text_strip_execution_plan_preserves_candidate_contract() -> None:
    candidates = BBoxTextStripCandidates(
        page_rects={1: ((10.0, 20.0, 30.0, 40.0),)},
        page_protected_rects={1: ((12.0, 22.0, 18.0, 28.0),)},
        pages_skipped_complex=1,
        skipped_complex_page_indices=frozenset({4}),
        candidate_source="manifest",
    )

    plan = build_bbox_text_strip_execution_plan(
        source_pdf_path=Path("source.pdf"),
        output_pdf_path=Path("output.pdf"),
        candidates=candidates,
        candidate_elapsed=1.25,
    )

    assert plan.has_work is True
    assert plan.candidate_elapsed == pytest.approx(1.25)
    assert plan.candidates.candidate_source == "manifest"
    assert plan.page_rects[1][0] == fitz.Rect(10.0, 20.0, 30.0, 40.0)
    assert plan.page_protected_rects[1][0] == fitz.Rect(12.0, 22.0, 18.0, 28.0)


def test_page_bbox_resolver_prefers_item_source_text_match_over_page_vote(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    doc = fitz.open()
    page = doc.new_page(width=300, height=800)
    page.insert_text((50, 100), "Top target paragraph", fontsize=12)
    page.insert_text((50, 680), "Bottom distractor paragraph", fontsize=12)
    doc.save(source_pdf)
    doc.close()

    doc = fitz.open(source_pdf)
    page = doc[0]
    item = {
        "item_id": "p001-b001",
        "bbox": [45.0, 88.0, 210.0, 112.0],
        "source_text": "Top target paragraph",
    }
    resolver = PageBBoxResolver.build(page, items=[item])
    raw_rect = raw_bbox_rect(item["bbox"])

    assert raw_rect is not None
    candidate_scores = {
        candidate.name: score_item_coordinate_candidate(page, item, candidate, raw_rect, resolver.text_index)
        for candidate in BBOX_COORDINATE_CANDIDATES
    }
    assert candidate_scores["raw_top_left"].source_match_score > 0.9
    assert candidate_scores["pdf_matrix"].source_match_score < 0.35
    assert resolver.item_candidates[item["item_id"]].name == "raw_top_left"
    assert page.get_text("text", clip=resolver.resolve_item_bbox_rect(item)).strip() == "Top target paragraph"


def test_page_bbox_resolver_builds_one_page_text_index_for_many_items() -> None:
    class FakePage:
        rect = fitz.Rect(0, 0, 300, 800)
        transformation_matrix = fitz.Matrix(1, 1)

        def __init__(self) -> None:
            self.get_text_calls: list[tuple[str, object]] = []

        def get_bboxlog(self) -> list[tuple[str, tuple[float, float, float, float]]]:
            return [("fill-text", (40.0, 80.0 + index * 20.0, 170.0, 96.0 + index * 20.0)) for index in range(20)]

        def get_text(self, option: str, *args, **kwargs):
            self.get_text_calls.append((option, kwargs.get("clip")))
            if option == "words":
                return [
                    (50.0, 82.0 + index * 20.0, 100.0, 94.0 + index * 20.0, f"Target{index}", 0, index, 0)
                    for index in range(20)
                ]
            raise AssertionError("resolver should use page-level words index, not per-item clip text extraction")

    page = FakePage()
    items = [
        {
            "item_id": f"p001-b{index:03d}",
            "bbox": [45.0, 80.0 + index * 20.0, 125.0, 98.0 + index * 20.0],
            "source_text": f"Target{index}",
        }
        for index in range(20)
    ]

    resolver = PageBBoxResolver.build(page, items=items)

    assert len(resolver.item_candidates) == 20
    assert page.get_text_calls == [("words", None)]


def test_source_cleanup_skips_low_confidence_item_coordinates(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    doc = fitz.open()
    page = doc.new_page(width=300, height=800)
    page.insert_text((50, 100), "Actual text in PDF", fontsize=12)
    doc.save(source_pdf)
    doc.close()

    candidates = plan_source_cleanup(
        source_pdf_path=source_pdf,
        translated_pages={
            0: [
                {
                    "item_id": "p001-b001",
                    "block_kind": "text",
                    "block_type": "text",
                    "bbox": [45.0, 88.0, 210.0, 112.0],
                    "source_text": "Different OCR text that is not on this page",
                    "protected_translated_text": "不同的译文",
                }
            ]
        },
        skip_form_xobject_pages=False,
    )

    assert candidates.page_rects == {}
    assert len(candidates.decisions) == 1
    decision = candidates.decisions[0]
    assert decision.item_id == "p001-b001"
    assert decision.action == SOURCE_CLEANUP_DECISION_STRIP
    assert decision.status == SOURCE_CLEANUP_DECISION_STATUS_SKIPPED
    assert decision.reason == "low_source_text_match"


def test_source_cleanup_emits_decision_for_high_confidence_item_coordinates(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    doc = fitz.open()
    page = doc.new_page(width=300, height=800)
    page.insert_text((50, 100), "Actual text in PDF", fontsize=12)
    doc.save(source_pdf)
    doc.close()

    candidates = plan_source_cleanup(
        source_pdf_path=source_pdf,
        translated_pages={
            0: [
                {
                    "item_id": "p001-b001",
                    "block_kind": "text",
                    "block_type": "text",
                    "bbox": [45.0, 88.0, 210.0, 112.0],
                    "source_text": "Actual text in PDF",
                    "protected_translated_text": "PDF 中的实际文本",
                }
            ]
        },
        skip_form_xobject_pages=False,
    )

    assert 0 in candidates.page_rects
    assert len(candidates.decisions) == 1
    decision = candidates.decisions[0]
    assert decision.item_id == "p001-b001"
    assert decision.status == SOURCE_CLEANUP_DECISION_STATUS_EMITTED
    assert decision.reason == "source_text_match"
    assert decision.coordinate_confidence is not None
    assert decision.coordinate_confidence > 0.9
    assert decision.strip_rects


def test_source_cleanup_decision_trace_records_noop_for_skip_translation(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    doc = fitz.open()
    page = doc.new_page(width=300, height=800)
    page.insert_text((50, 100), "KEYWORDS: density functional theory", fontsize=12)
    doc.save(source_pdf)
    doc.close()

    candidates = plan_source_cleanup(
        source_pdf_path=source_pdf,
        translated_pages={
            0: [
                {
                    "item_id": "p001-b001",
                    "block_kind": "text",
                    "block_type": "text",
                    "layout_role": "metadata",
                    "semantic_role": "metadata",
                    "tags": ["skip_translation"],
                    "bbox": [45.0, 88.0, 260.0, 112.0],
                    "source_text": "KEYWORDS: density functional theory",
                    "protected_translated_text": "KEYWORDS: density functional theory",
                }
            ]
        },
        skip_form_xobject_pages=False,
    )

    assert candidates.page_rects == {}
    assert len(candidates.decisions) == 1
    decision = candidates.decisions[0]
    assert decision.item_id == "p001-b001"
    assert decision.action == "noop"
    assert decision.status == SOURCE_CLEANUP_DECISION_STATUS_SKIPPED
    assert decision.reason == "marked_non_translated_preserve_source"


def test_source_cleanup_force_strip_role_wins_over_same_source_text() -> None:
    intent = classify_source_cleanup_intent(
        {
            "item_id": "p001-b001",
            "block_kind": "text",
            "block_type": "text",
            "layout_role": "footnote",
            "semantic_role": "metadata",
            "normalized_sub_type": "table_footnote",
            "source_text": "www.example.com",
            "protected_translated_text": "www.example.com",
        }
    )

    assert intent.translation_state == "translated"
    assert intent.cleanup_action == "strip_text"


def test_form_xobject_cleanup_plan_reports_unsafe_vector_fallback_item(tmp_path: Path) -> None:
    source_pdf = tmp_path / "source.pdf"
    doc = fitz.open()
    page = doc.new_page(width=300, height=200)
    page.insert_text((50, 100), "Figure 1. Source caption", fontsize=12)
    page.draw_rect(fitz.Rect(52, 88, 58, 96), color=(0, 0, 0), fill=(0, 0, 0))
    doc.save(source_pdf)
    doc.close()

    doc = fitz.open(source_pdf)
    try:
        page_plan = plan_source_cleanup_page(
            doc,
            doc[0],
            translated_items=[
                {
                    "item_id": "p001-b001",
                    "block_kind": "text",
                    "block_type": "text",
                    "layout_role": "caption",
                    "semantic_role": "metadata",
                    "normalized_sub_type": "figure_caption",
                    "bbox": [45.0, 88.0, 230.0, 112.0],
                    "source_text": "Figure 1. Source caption",
                    "protected_translated_text": "图 1. 源标题",
                }
            ],
            skip_form_xobject_pages=True,
            features=PageCleanupFeatures(has_form_xobjects=True),
        )
    finally:
        doc.close()

    assert "p001-b001" in page_plan.uncovered_unsafe_vector_item_ids
