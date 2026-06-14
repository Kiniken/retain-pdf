import sys
import tempfile
import json
from pathlib import Path
from unittest import mock


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from devtools.tests.rendering_support.prewarm_fixtures import empty_region_page_payload as _empty_region_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import page_payload as _page_payload
from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload as _translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_pseudo_editable_scan_pdf as _pseudo_editable_scan_pdf
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf as _source_pdf
from foundation.config import layout
from services.rendering.source.prewarm import RenderPrewarmSpec
from services.rendering.source.prewarm import build_render_prewarm_fingerprint
from services.rendering.source.prewarm import prewarm_manifest_path_from_artifacts_dir
from services.rendering.source.prewarm import start_render_source_prewarm
from services.rendering.source.prewarm import try_load_prewarmed_render_source_pdf
from services.rendering.source.render_source import build_render_source_pdf
from services.rendering.source_cleanup.contracts import SourceCleanupResult
from services.rendering.source_cleanup.types import BBoxTextStripResult


def test_legacy_fast_cover_source_manifest_is_ignored() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)
        manifest_path = prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        manifest_path.parent.mkdir(parents=True)
        manifest_path.write_text(
            json.dumps(
                {
                    "schema": "render_source_prewarm_v1",
                    "fingerprint": build_render_prewarm_fingerprint(
                        source_pdf_path=source_pdf,
                        translated_pages=_translated_page_payload(),
                        effective_render_mode="overlay",
                        start_page=0,
                        end_page=0,
                        pdf_compress_dpi=0,
                        source_cleanup_strategy="bbox_text_strip",
                    ),
                    "render_source": {
                        "path": str(source_pdf),
                        "bbox_text_stripped_page_indices": [],
                        "bbox_text_strip_skipped_page_indices": [0],
                        "source_text_precleaned_page_indices": [],
                    },
                    "payload_prewarm": {},
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        prepared = try_load_prewarmed_render_source_pdf(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        )

        assert prepared is None


def test_render_source_prewarm_keeps_no_text_overlap_pages_as_precleaned() -> None:
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
                translated_pages=_empty_region_page_payload(),
                render_mode="overlay",
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
            )
        )
        manifest_path = handle.wait()

        prepared = try_load_prewarmed_render_source_pdf(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_empty_region_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        )

        assert prepared is not None
        assert prepared.bbox_text_stripped_page_indices == frozenset()
        assert prepared.bbox_text_strip_skipped_page_indices == frozenset({0})
        assert prepared.source_text_precleaned_page_indices == frozenset()


def test_pseudo_editable_scan_pages_keep_cover_fallback_after_text_strip() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _pseudo_editable_scan_pdf(source_pdf)

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

        prepared = try_load_prewarmed_render_source_pdf(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="pikepdf_text_strip",
        )

        assert prepared is not None
        assert prepared.bbox_text_stripped_page_indices == frozenset()
        assert prepared.bbox_text_strip_skipped_page_indices == frozenset({0})
        assert prepared.source_text_precleaned_page_indices == frozenset()


def test_changed_complex_pages_still_keep_cover_fallback() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        output_pdf.parent.mkdir()
        source_pdf.write_bytes(b"%PDF-1.7\n")

        stripped_pdf = root / "rendered" / "out.source-bbox-text-stripped.pdf"
        cleanup_result = SourceCleanupResult(
            bbox_text_strip=BBoxTextStripResult(
                changed=True,
                output_pdf_path=stripped_pdf,
                pages_changed=1,
                pages_skipped_complex=1,
                changed_page_indices=frozenset({0}),
                skipped_complex_page_indices=frozenset({0}),
            )
        )

        with (
            mock.patch("services.rendering.source.render_source.build_invalid_xobject_sanitized_pdf_copy") as sanitize,
            mock.patch("services.rendering.source.render_source.execute_source_cleanup", return_value=cleanup_result),
        ):
            sanitize.return_value.changed = False
            sanitize.return_value.output_pdf_path = None
            prepared = build_render_source_pdf(
                source_pdf_path=source_pdf,
                output_pdf_path=output_pdf,
                pdf_compress_dpi=0,
                translated_pages=_translated_page_payload(),
                source_cleanup_strategy="pikepdf_text_strip",
            )

        assert prepared.bbox_text_stripped_page_indices == frozenset({0})
        assert prepared.source_text_precleaned_page_indices == frozenset({0})
        assert prepared.source_cleanup_cover_fallback_page_indices == frozenset({0})
