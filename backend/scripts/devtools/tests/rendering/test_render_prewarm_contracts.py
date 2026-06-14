import sys
import tempfile
import json
from pathlib import Path
from unittest import mock


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from devtools.tests.rendering_support.prewarm_fixtures import page_payload as _page_payload
from devtools.tests.rendering_support.prewarm_fixtures import translated_page_payload as _translated_page_payload
from devtools.tests.rendering_support.prewarm_fixtures import write_document_v1 as _document_v1
from devtools.tests.rendering_support.prewarm_fixtures import write_source_pdf as _source_pdf
from foundation.config import layout
from services.rendering.source.prewarm import PAYLOAD_RENDER_ALGORITHM_VERSION
from services.rendering.source.prewarm import build_render_prewarm_fingerprint
from services.rendering.source.prewarm import prewarm_manifest_path_from_artifacts_dir
from services.rendering.source.prewarm import try_load_render_payload_prewarm
from services.rendering.source.prewarm import try_load_prewarmed_render_source_pdf
from services.rendering.source.preprocess_inputs import build_preprocess_protected_pages
from runtime.pipeline.render_preprocess import run_ocr_render_preprocess


def test_preprocess_inputs_filters_protected_blocks_owned_by_translated_payload() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        artifacts_dir = root / "artifacts"
        normalized_path = root / "ocr" / "normalized" / "document.v1.json"
        normalized_path.parent.mkdir(parents=True)
        normalized_path.write_text(
            json.dumps(
                {
                    "schema": "normalized_document_v1",
                    "pages": [
                        {
                            "page_index": 0,
                            "blocks": [
                                {
                                    "block_id": "owned-body",
                                    "bbox": [10.0, 20.0, 150.0, 60.0],
                                    "content": {"kind": "text", "text": "owned body"},
                                    "policy": {"translate": False},
                                },
                                {
                                    "block_id": "kept-source",
                                    "bbox": [10.0, 120.0, 150.0, 160.0],
                                    "content": {"kind": "text", "text": "metadata source"},
                                    "policy": {"translate": False},
                                },
                            ],
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )

        protected_pages = build_preprocess_protected_pages(
            artifacts_dir=artifacts_dir,
            translated_pages=_translated_page_payload(),
        )

    assert [item["item_id"] for item in protected_pages[0]] == ["kept-source"]


def test_ocr_render_preprocess_manifest_matches_translated_payload() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        source_json = root / "ocr" / "normalized" / "document.v1.json"
        output_pdf = root / "rendered" / "out.pdf"
        artifacts_dir = root / "artifacts"
        output_pdf.parent.mkdir()
        _source_pdf(source_pdf)
        _document_v1(source_json)

        manifest_path = run_ocr_render_preprocess(
            source_json_path=source_json,
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            artifacts_dir=artifacts_dir,
            render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
            math_mode="direct_typst",
        )

        translated_payload = _translated_page_payload()
        translated_payload[0][0]["item_id"] = "p001-b000"
        translated_payload[0][0]["translation_unit_id"] = "p001-b000"
        translated_payload[0][0]["translation_unit_member_ids"] = ["p001-b000"]
        translated_payload[0][0]["raw_block_type"] = "text"
        translated_payload[0][0]["normalized_sub_type"] = "text"

        assert manifest_path == prewarm_manifest_path_from_artifacts_dir(artifacts_dir)
        assert try_load_prewarmed_render_source_pdf(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=translated_payload,
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy="bbox_text_strip",
        ) is None
        payload = try_load_render_payload_prewarm(
            manifest_path=manifest_path,
            source_pdf_path=source_pdf,
            translated_pages=translated_payload,
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
            source_cleanup_strategy=layout.SOURCE_CLEANUP_TYPST_FILL,
        )
        assert payload is not None
        assert payload.render_colors_by_item_id
        assert payload.document_analysis is not None


def test_render_prewarm_fingerprint_tracks_payload_render_algorithm() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        fingerprint = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=_translated_page_payload(),
            effective_render_mode="overlay",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

    assert fingerprint["payload_render_algorithm"] == PAYLOAD_RENDER_ALGORITHM_VERSION
    assert fingerprint["bbox_text_strip_algorithm"] == "bbox_text_strip"
    assert len(str(fingerprint["bbox_text_strip_implementation_hash"])) == 64


def test_render_prewarm_fingerprint_tracks_translated_text_changes() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        first_payload = _translated_page_payload()
        second_payload = _translated_page_payload()
        second_payload[0][0]["protected_translated_text"] = "另一版译文"

        first = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=first_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )
        second = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=second_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

    assert first["render_payload_hash"] != second["render_payload_hash"]
    assert first != second


def test_render_prewarm_fingerprint_tracks_formula_map_changes() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        _source_pdf(source_pdf)

        first_payload = _translated_page_payload()
        second_payload = _translated_page_payload()
        first_payload[0][0]["formula_map"] = [{"placeholder": "<f0-abc/>", "formula_text": "c_{\\kappa}"}]
        second_payload[0][0]["formula_map"] = [{"placeholder": "<f0-abc/>", "formula_text": "c_{\\lambda}"}]

        first = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=first_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )
        second = build_render_prewarm_fingerprint(
            source_pdf_path=source_pdf,
            translated_pages=second_payload,
            effective_render_mode="typst_visual",
            start_page=0,
            end_page=0,
            pdf_compress_dpi=0,
        )

    assert first["render_payload_hash"] != second["render_payload_hash"]
    assert first != second


def test_redact_restore_formula_strategy_is_runtime_alias_for_pikepdf_text_strip() -> None:
    assert layout.normalize_source_cleanup_strategy("redact_restore_formulas") == "pikepdf_text_strip"
    assert layout.use_bbox_text_strip_cleanup("redact_restore_formulas") is True
    assert layout.use_redact_restore_formula_cleanup("redact_restore_formulas") is False
