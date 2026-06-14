import sys
import tempfile
import json
from pathlib import Path
from unittest import mock


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from devtools.tests.rendering_support.prewarm_fixtures import page_payload as _page_payload
from devtools.tests.rendering_support.prewarm_fixtures import source_document_analysis
from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload as _translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf as _source_pdf
from runtime.pipeline.render_plan import RenderPlan
from runtime.pipeline.render_inputs import RenderInputs
from foundation.config import layout
from services.rendering.source.prewarm import RenderPrewarmSpec
from services.rendering.source.prewarm import build_render_prewarm_fingerprint
from services.rendering.source.prewarm import prewarm_manifest_path_from_artifacts_dir
from services.rendering.source.prewarm import start_render_source_prewarm
from services.rendering.source.prewarm import try_load_render_payload_prewarm
from services.rendering.workflow.executor import execute_render_plan


def test_render_source_prewarm_manifest_is_reused_without_temp_cleanup() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        translations_dir = root / "translated"
        output_pdf.parent.mkdir()
        translations_dir.mkdir()
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
        assert manifest_path == prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        assert manifest_path.exists()

        render_plan = RenderPlan(
            render_inputs=RenderInputs(
                source_pdf_path=source_pdf,
                translations_dir=translations_dir,
                translation_manifest_path=None,
            ),
            selected_pages=_translated_page_payload(),
            effective_render_mode="overlay",
        )

        def _fake_overlay(*, source_pdf_path, translated_pages, context):
            assert artifacts_dir in source_pdf_path.parents
            assert source_pdf_path.exists()
            return 1, {"route": "prewarm-test"}

        with mock.patch(
            "services.rendering.workflow.executor.build_render_source_pdf",
            side_effect=AssertionError("synchronous render source prep should not run"),
        ), mock.patch(
            "services.rendering.workflow.executor.run_overlay_render",
            side_effect=_fake_overlay,
        ):
            pages = execute_render_plan(
                render_plan=render_plan,
                output_pdf_path=output_pdf,
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                render_prewarm_manifest_path=manifest_path,
            )

        assert pages == 1
        assert any(path.name.endswith(".source-bbox-text-stripped.pdf") for path in artifacts_dir.rglob("*.pdf"))


def test_render_plan_persists_sync_source_prewarm_for_next_render() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        translations_dir = root / "translated"
        output_pdf.parent.mkdir()
        translations_dir.mkdir()
        _source_pdf(source_pdf)
        manifest_path = prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        translated_pages = _translated_page_payload()
        translated_pages[0][0]["lines"] = [
            {"bbox": [34.0, 20.0, 150.0, 30.0]},
            {"bbox": [12.0, 32.0, 150.0, 42.0]},
            {"bbox": [12.5, 44.0, 150.0, 54.0]},
        ]
        render_plan = RenderPlan(
            render_inputs=RenderInputs(
                source_pdf_path=source_pdf,
                translations_dir=translations_dir,
                translation_manifest_path=None,
            ),
            selected_pages=translated_pages,
            effective_render_mode="overlay",
        )

        seen_indents: list[dict[str, float]] = []

        def _fake_overlay(*, source_pdf_path, translated_pages, context):
            assert source_pdf_path.exists()
            seen_indents.append(context.first_line_indent_lookup or {})
            return 1, {"route": "sync-cache-test"}

        with mock.patch(
            "services.rendering.workflow.executor.run_overlay_render",
            side_effect=_fake_overlay,
        ):
            pages = execute_render_plan(
                render_plan=render_plan,
                output_pdf_path=output_pdf,
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                render_prewarm_manifest_path=manifest_path,
            )

        assert pages == 1
        assert manifest_path.exists()
        assert any(path.name.endswith(".source-bbox-text-stripped.pdf") for path in artifacts_dir.rglob("*.pdf"))
        payload_prewarm = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=translated_pages,
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        )
        assert payload_prewarm is not None
        assert payload_prewarm.first_line_indent_lookup["p001-b001"] == 19.87
        assert seen_indents and seen_indents[0]["p001-b001"] == 19.87
        assert payload_prewarm.bbox_text_strip_candidates is not None
        assert payload_prewarm.bbox_text_strip_candidates.candidate_source == "manifest"

        with mock.patch(
            "services.rendering.workflow.executor.build_render_source_pdf",
            side_effect=AssertionError("persisted sync render source should be reused"),
        ), mock.patch(
            "services.rendering.workflow.executor.run_overlay_render",
            side_effect=_fake_overlay,
        ):
            pages = execute_render_plan(
                render_plan=render_plan,
                output_pdf_path=output_pdf,
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                render_prewarm_manifest_path=manifest_path,
            )

        assert pages == 1
        diagnostics = dict(getattr(execute_render_plan, "last_render_diagnostics", {}) or {})
        assert diagnostics["bbox_text_strip_candidate_source"] == "manifest"
        assert diagnostics["bbox_text_strip_candidate_pages"] > 0


def test_render_plan_reuses_source_prewarm_without_sync_document_analysis() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        translations_dir = root / "translated"
        output_pdf.parent.mkdir()
        translations_dir.mkdir()
        _source_pdf(source_pdf)
        manifest_path = prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        render_plan = RenderPlan(
            render_inputs=RenderInputs(
                source_pdf_path=source_pdf,
                translations_dir=translations_dir,
                translation_manifest_path=None,
            ),
            selected_pages=_translated_page_payload(),
            effective_render_mode="overlay",
        )

        def _fake_overlay(*, source_pdf_path, translated_pages, context):
            assert source_pdf_path.exists()
            return 1, {"route": "sync-cache-test"}

        with mock.patch(
            "services.rendering.workflow.executor.run_overlay_render",
            side_effect=_fake_overlay,
        ):
            execute_render_plan(
                render_plan=render_plan,
                output_pdf_path=output_pdf,
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                render_prewarm_manifest_path=manifest_path,
            )

        with mock.patch(
            "services.rendering.analysis.document.builder.build_render_document_analysis",
            side_effect=AssertionError("cached render source should not trigger document analysis scan"),
        ), mock.patch(
            "services.rendering.workflow.executor.build_render_source_pdf",
            side_effect=AssertionError("persisted sync render source should be reused"),
        ), mock.patch(
            "services.rendering.workflow.executor.run_overlay_render",
            side_effect=_fake_overlay,
        ):
            pages = execute_render_plan(
                render_plan=render_plan,
                output_pdf_path=output_pdf,
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                render_prewarm_manifest_path=manifest_path,
            )

        assert pages == 1


def test_sync_source_prewarm_preserves_existing_payload_prewarm() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        translations_dir = root / "translated"
        output_pdf.parent.mkdir()
        translations_dir.mkdir()
        _source_pdf(source_pdf)
        manifest_path = prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        manifest_path.parent.mkdir(parents=True)
        render_plan = RenderPlan(
            render_inputs=RenderInputs(
                source_pdf_path=source_pdf,
                translations_dir=translations_dir,
                translation_manifest_path=None,
            ),
            selected_pages=_translated_page_payload(),
            effective_render_mode="overlay",
        )
        existing_payload = {
            "first_line_indent_by_item_id": {"p001-b001": 12.5},
            "effective_inner_bbox_by_item_id": {"p001-b001": [10, 20, 100, 80]},
            "render_color_profile": {
                "algorithm": "render_color_profile_v2_tuple_color",
                "colors_by_item_id": {
                    "p001-b001": {
                        "cover_fill": [0.9, 0.9, 0.9],
                        "text_color": [0.1, 0.1, 0.1],
                    }
                },
            },
        }
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
                    "render_source": {"path": "missing.pdf"},
                    "payload_prewarm": existing_payload,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        seen_colors: list[dict] = []

        def _fake_overlay(*, source_pdf_path, translated_pages, context):
            assert source_pdf_path.exists()
            seen_colors.append(context.render_colors_by_item_id or {})
            return 1, {"route": "sync-cache-payload-preserve"}

        with mock.patch(
            "services.rendering.workflow.executor.run_overlay_render",
            side_effect=_fake_overlay,
        ):
            pages = execute_render_plan(
                render_plan=render_plan,
                output_pdf_path=output_pdf,
                start_page=0,
                end_page=0,
                pdf_compress_dpi=0,
                source_cleanup_strategy="bbox_text_strip",
                render_prewarm_manifest_path=manifest_path,
            )

        assert pages == 1
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
        assert payload_prewarm.first_line_indent_lookup["p001-b001"] == 12.5
        assert payload_prewarm.render_colors_by_item_id is not None
        assert payload_prewarm.render_colors_by_item_id["p001-b001"]["text_color"] == (0.1, 0.1, 0.1)
        assert seen_colors and seen_colors[0]["p001-b001"]["cover_fill"] == (0.9, 0.9, 0.9)


def test_second_prewarm_reuses_existing_source_and_refreshes_payload() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)

        first_handle = start_render_source_prewarm(
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
        manifest_path = first_handle.wait()

        with mock.patch(
            "services.rendering.source.preprocess.build_render_source_pdf",
            side_effect=AssertionError("existing prewarmed source should be reused"),
        ):
            second_handle = start_render_source_prewarm(
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
                )
            )
            assert second_handle.wait() == manifest_path

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
        assert payload_prewarm.render_colors_by_item_id
