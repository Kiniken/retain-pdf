import sys
import tempfile
import json
from pathlib import Path
from unittest import mock


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from devtools.tests.rendering_support.prewarm_fixtures import page_payload as _page_payload
from devtools.tests.rendering_support.prewarm_fixtures import source_document_analysis
from devtools.tests.rendering_support.prewarm_fixtures import tight_gap_page_payload as _tight_gap_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload as _translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf as _source_pdf
from foundation.config import layout
from services.rendering.source.prewarm import RenderPrewarmSpec
from services.rendering.source.prewarm import start_render_source_prewarm
from services.rendering.source.prewarm import try_load_render_payload_prewarm
from services.rendering.source.prewarm import _pages_for_prewarm_mode_probe
from services.rendering.source.prewarm_payload import build_payload_prewarm
from services.rendering.source.prewarm_payload import first_line_indent_from_item_lines


def test_first_line_indent_from_item_lines_uses_structured_line_bboxes() -> None:
    item = {
        "lines": [
            {"bbox": [42.0, 10.0, 180.0, 20.0]},
            {"bbox": [24.0, 22.0, 180.0, 32.0]},
            {"bbox": [24.5, 34.0, 180.0, 44.0]},
        ]
    }

    assert first_line_indent_from_item_lines(item, font_size_pt=12.0) == 17.75


def test_first_line_indent_from_item_lines_ignores_small_offsets() -> None:
    item = {
        "lines": [
            {"bbox": [29.0, 10.0, 180.0, 20.0]},
            {"bbox": [24.0, 22.0, 180.0, 32.0]},
        ]
    }

    assert first_line_indent_from_item_lines(item, font_size_pt=12.0) == 0.0


def test_payload_prewarm_reads_page_width_from_open_source_doc() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        with mock.patch(
            "services.rendering.source.prewarm_payload.page_widths_by_index",
            side_effect=AssertionError("payload prewarm should not reopen the source PDF just for page widths"),
        ):
            payload = build_payload_prewarm(
                source_pdf_path=source_pdf,
                translated_pages=_translated_page_payload(),
                manifest_path=root / "manifest.json",
                effective_render_mode="overlay",
                source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
            )

        assert payload["effective_inner_bbox_by_item_id"]["p001-b001"]


def test_payload_prewarm_color_adapt_reuses_open_source_doc() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        with mock.patch(
            "services.rendering.source.prewarm_payload.apply_page_color_adapt_for_prewarm",
            create=True,
            side_effect=AssertionError("payload prewarm should color-adapt from the already-open source document"),
        ), mock.patch(
            "services.rendering.source.prewarm_color_profile.apply_page_color_adapt_for_prewarm",
            side_effect=AssertionError("color profile should reuse prewarmed color-adapted pages"),
        ):
            payload = build_payload_prewarm(
                source_pdf_path=source_pdf,
                translated_pages=_translated_page_payload(),
                manifest_path=root / "manifest.json",
                effective_render_mode="overlay",
                source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
            )

        assert payload["render_color_profile"]["colors_by_item_id"]["p001-b001"]


def test_prewarm_mode_probe_uses_source_text_without_mutating_payload() -> None:
    pages = _page_payload()
    assert pages[0][0].get("render_protected_text") is None

    probed = _pages_for_prewarm_mode_probe(pages)

    assert probed[0][0]["render_protected_text"] == "inside source"
    assert pages[0][0].get("render_protected_text") is None


def test_payload_prewarm_manifest_exposes_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                document_analysis=source_document_analysis(source_pdf),
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        )

        assert payload_prewarm is not None
        assert payload_prewarm.document_analysis is not None
        assert payload_prewarm.document_analysis.page(0) is not None
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.page_rects


def test_payload_prewarm_pikepdf_text_strip_exposes_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="pikepdf_text_strip",
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="pikepdf_text_strip",
        )

        assert payload_prewarm is not None
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.page_rects


def test_payload_prewarm_default_pikepdf_text_strip_exposes_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

        assert payload_prewarm is not None
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.page_rects


def test_payload_prewarm_explicit_typst_fill_skips_bbox_candidates() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_translated_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="typst_fill",
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="typst_fill",
        )

        assert payload_prewarm is not None
        assert payload_prewarm.bbox_text_strip_candidates is None


def test_payload_prewarm_manifest_exposes_geometry_adjustments() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        handle = start_render_source_prewarm(
            RenderPrewarmSpec(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                artifacts_dir=artifacts_dir,
                translated_pages=_tight_gap_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
            )
        )
        manifest_path = handle.wait()

        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_tight_gap_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

        assert payload_prewarm is not None
        adjusted = payload_prewarm.effective_inner_bbox_lookup["p001-b001"]
        assert adjusted[1] > 20.0
        assert adjusted[3] < 70.0
