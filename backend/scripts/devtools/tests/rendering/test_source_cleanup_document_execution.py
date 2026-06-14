from __future__ import annotations

import sys
import tempfile
from pathlib import Path
from unittest import mock

import fitz
import pikepdf
import pytest
from pikepdf import Name


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from services.rendering.source_cleanup import strip_bbox_text_execution_plan_from_pdf_copy
from services.rendering.source_cleanup import strip_bbox_text_rects_from_pdf_copy
from services.rendering.source_cleanup.execution_plan import build_bbox_text_strip_execution_plan
from services.rendering.source_cleanup.pdf import document as source_cleanup_document
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STATUS_EMITTED
from services.rendering.source_cleanup.types import SOURCE_CLEANUP_DECISION_STRIP
from services.rendering.source_cleanup.types import BBoxTextStripCandidates
from services.rendering.source_cleanup.types import SourceCleanupDecision


def test_bbox_text_strip_single_worker_preserves_form_recursion(monkeypatch: pytest.MonkeyPatch) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        for _index in range(85):
            page = doc.new_page(width=240, height=180)
            page.insert_text((30, 50), "remove me", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "1")
        monkeypatch.setattr(source_cleanup_document, "BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD", 1)
        seen_recurse_forms: list[bool] = []

        def fake_strip_page(
            *,
            pdf: pikepdf.Pdf,
            page_idx: int,
                rects: list[fitz.Rect],
                protected_rects: list[fitz.Rect],
                recurse_forms: bool,
                execution_policy=None,
            ):
            seen_recurse_forms.append(recurse_forms)
            return source_cleanup_document._PageRewriteResult(
                page_idx=page_idx,
                content_stream=b"",
                removed=0,
                forms_changed=0,
            )

        with mock.patch.object(source_cleanup_document, "_strip_page_in_open_pdf", side_effect=fake_strip_page):
            strip_bbox_text_rects_from_pdf_copy(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                page_rects={index: [fitz.Rect(20.0, 35.0, 120.0, 65.0)] for index in range(85)},
                recurse_forms=True,
            )

    assert seen_recurse_forms
    assert set(seen_recurse_forms) == {True}


def test_bbox_text_strip_parallel_worker_count_scales_for_medium_documents() -> None:
    assert source_cleanup_document._parallel_worker_count(30) >= 2
    assert source_cleanup_document._parallel_worker_count(500) <= source_cleanup_document.BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS


def test_parallel_bbox_text_strip_workers_avoid_main_process_page_rewrite(monkeypatch: pytest.MonkeyPatch) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        for _index in range(16):
            page = doc.new_page(width=240, height=180)
            page.insert_text((30, 50), "remove me", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "2")
        monkeypatch.setattr(source_cleanup_document, "BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD", 1)
        with mock.patch.object(
            source_cleanup_document,
            "_strip_page_in_open_pdf",
            side_effect=AssertionError("plain pages should be rewritten by workers, not in the main process"),
        ):
            result = strip_bbox_text_rects_from_pdf_copy(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                page_rects={index: [fitz.Rect(20.0, 115.0, 120.0, 150.0)] for index in range(16)},
                recurse_forms=False,
            )

    assert result.changed is True


def test_bbox_text_strip_reuses_manifest_page_features_for_form_gate(monkeypatch: pytest.MonkeyPatch) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        for _index in range(16):
            page = doc.new_page(width=240, height=180)
            page.insert_text((30, 50), "remove me", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        monkeypatch.setattr(source_cleanup_document, "BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD", 1)
        monkeypatch.setattr(
            source_cleanup_document,
            "_page_has_form_xobjects",
            mock.Mock(side_effect=AssertionError("page_features should avoid repeated form xobject probing")),
        )

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={index: [fitz.Rect(20.0, 115.0, 120.0, 150.0)] for index in range(16)},
            recurse_forms=True,
            page_features={
                index: {"content_stream_size": 1, "has_form_xobjects": False}
                for index in range(16)
            },
        )

    assert result.changed is True


def test_bbox_text_strip_chunks_balance_stream_weights() -> None:
    pdf = pikepdf.Pdf.new()
    sizes = [1200, 1100, 1000, 220, 210, 200, 190, 180, 170]
    for size in sizes:
        page = pdf.add_blank_page(page_size=(120, 120))
        page.obj[Name("/Contents")] = pdf.make_stream(b"q\n" + (b" " * size) + b"\nQ")

    page_rects = {
        index: [fitz.Rect(10.0, 10.0, 60.0, 40.0)]
        for index in range(len(sizes))
    }

    chunks = source_cleanup_document._page_chunks(Path("source.pdf"), pdf, page_rects, {}, 3)
    loads = [sum(task.weight for task in chunk) for chunk in chunks]

    assert len(chunks) == 3
    assert max(loads) - min(loads) < max(sizes)


def test_bbox_text_strip_execution_plan_entrypoint_removes_text() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=240, height=180)
        page.insert_text((30, 50), "remove me", fontsize=12)
        doc.save(source_pdf)
        doc.close()
        candidates = BBoxTextStripCandidates(
            page_rects={0: ((20.0, 115.0, 120.0, 150.0),)},
            candidate_source="manifest",
        )
        plan = build_bbox_text_strip_execution_plan(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            candidates=candidates,
            candidate_elapsed=0.5,
        )

        result = strip_bbox_text_execution_plan_from_pdf_copy(execution_plan=plan)

        assert result.changed is True
        assert result.text_show_ops_removed == 1
        assert output_pdf.exists()


def test_execution_plan_does_not_remove_body_fill_paths_without_decision_authorization() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        _write_path_text_pdf(source_pdf)
        candidates = BBoxTextStripCandidates(
            page_rects={0: ((20.0, 35.0, 100.0, 80.0),)},
            decisions=(
                SourceCleanupDecision(
                    page_idx=0,
                    item_id="p001-b001",
                    action=SOURCE_CLEANUP_DECISION_STRIP,
                    status=SOURCE_CLEANUP_DECISION_STATUS_EMITTED,
                    reason="source_text_match",
                    strip_rects=((20.0, 35.0, 100.0, 80.0),),
                    source_role="body_text",
                    layout_role="paragraph",
                    semantic_role="body",
                    normalized_sub_type="text",
                ),
            ),
        )
        plan = build_bbox_text_strip_execution_plan(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            candidates=candidates,
        )

        result = strip_bbox_text_execution_plan_from_pdf_copy(execution_plan=plan)

        assert result.changed is True
        bboxlog = _page_bboxlog(output_pdf)
        assert any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(50, 100, 80, 130)) for kind, rect in bboxlog)


def test_parallel_execution_plan_preserves_empty_path_removal_policy(monkeypatch: pytest.MonkeyPatch) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        _write_multi_page_path_text_pdf(source_pdf, page_count=16)
        decisions = tuple(
            SourceCleanupDecision(
                page_idx=page_idx,
                item_id=f"p{page_idx + 1:03d}-b001",
                action=SOURCE_CLEANUP_DECISION_STRIP,
                status=SOURCE_CLEANUP_DECISION_STATUS_EMITTED,
                reason="source_text_match",
                strip_rects=((20.0, 35.0, 100.0, 80.0),),
                source_role="body_text",
                layout_role="paragraph",
                semantic_role="body",
                normalized_sub_type="text",
            )
            for page_idx in range(16)
        )
        candidates = BBoxTextStripCandidates(
            page_rects={page_idx: ((20.0, 35.0, 100.0, 80.0),) for page_idx in range(16)},
            decisions=decisions,
        )
        plan = build_bbox_text_strip_execution_plan(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            candidates=candidates,
        )
        monkeypatch.setenv("RETAIN_BBOX_TEXT_STRIP_WORKERS", "2")
        monkeypatch.setattr(source_cleanup_document, "BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD", 1)

        result = strip_bbox_text_execution_plan_from_pdf_copy(execution_plan=plan, recurse_forms=False)

        assert result.changed is True
        bboxlog = _page_bboxlog(output_pdf)
        assert any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(50, 100, 80, 130)) for kind, rect in bboxlog)


def test_execution_plan_removes_fill_paths_when_decision_authorizes_path_cleanup() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        _write_path_text_pdf(source_pdf)
        candidates = BBoxTextStripCandidates(
            page_rects={0: ((20.0, 35.0, 100.0, 80.0),)},
            decisions=(
                SourceCleanupDecision(
                    page_idx=0,
                    item_id="p001-b001",
                    action=SOURCE_CLEANUP_DECISION_STRIP,
                    status=SOURCE_CLEANUP_DECISION_STATUS_EMITTED,
                    reason="source_text_match",
                    strip_rects=((20.0, 35.0, 100.0, 130.0),),
                    source_role="body_text",
                    layout_role="footnote",
                    semantic_role="metadata",
                    normalized_sub_type="table_footnote",
                ),
            ),
        )
        plan = build_bbox_text_strip_execution_plan(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            candidates=candidates,
        )

        result = strip_bbox_text_execution_plan_from_pdf_copy(execution_plan=plan)

        assert result.changed is True
        bboxlog = _page_bboxlog(output_pdf)
        assert not any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(50, 100, 80, 130)) for kind, rect in bboxlog)


def _write_path_text_pdf(path: Path) -> None:
    pdf = pikepdf.Pdf.new()
    page = pdf.add_blank_page(page_size=(240, 180))
    page.obj[Name("/Contents")] = pdf.make_stream(
        b"BT /F1 12 Tf 30 50 Td (remove me) Tj ET\n"
        b"q 0 0 0 rg 60 60 m 65 60 l 65 70 l 60 70 l h f Q\n"
        b"q 0 0 0 rg 160 120 m 165 120 l 165 130 l 160 130 l h f Q\n"
    )
    page.obj[Name("/Resources")] = pikepdf.Dictionary(
        Font=pikepdf.Dictionary(
            F1=pikepdf.Dictionary(
                Type=Name("/Font"),
                Subtype=Name("/Type1"),
                BaseFont=Name("/Helvetica"),
            )
        )
    )
    pdf.save(path)


def _write_multi_page_path_text_pdf(path: Path, *, page_count: int) -> None:
    pdf = pikepdf.Pdf.new()
    for _page_idx in range(page_count):
        page = pdf.add_blank_page(page_size=(240, 180))
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 12 Tf 30 50 Td (remove me) Tj ET\n"
            b"q 0 0 0 rg 60 60 m 65 60 l 65 70 l 60 70 l h f Q\n"
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
    pdf.save(path)


def _page_bboxlog(path: Path) -> list:
    doc = fitz.open(path)
    try:
        return doc[0].get_bboxlog()
    finally:
        doc.close()
