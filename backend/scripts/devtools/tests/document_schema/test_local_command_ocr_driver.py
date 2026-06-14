import json
import sys
from pathlib import Path
from types import SimpleNamespace

import fitz


REPO_SCRIPTS_ROOT = Path("/home/wxyhgk/tmp/Code/backend/scripts")
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from foundation.shared.job_dirs import ensure_job_dirs
from foundation.shared.job_dirs import resolve_job_dirs
from services.ocr_provider.local_command_driver import LOCAL_OCR_COMMAND_ENV
from services.ocr_provider.local_command_driver import run_local_command_ocr_to_job_dir


def _write_source_pdf(path: Path) -> None:
    doc = fitz.open()
    page = doc.new_page(width=320, height=480)
    page.insert_text((72, 72), "provider pipeline paddle smoke")
    doc.save(path)
    doc.close()


def test_local_command_ocr_driver_accepts_document_v1_output(tmp_path: Path, monkeypatch) -> None:
    job_root = tmp_path / "20260606-local-ocr"
    job_dirs = resolve_job_dirs(job_root)
    ensure_job_dirs(job_dirs)
    source_pdf = job_dirs.source_dir / "book.pdf"
    _write_source_pdf(source_pdf)
    script_path = tmp_path / "fake_local_ocr.py"
    script_path.write_text(
        """
import json
import os
from pathlib import Path

target = Path(os.environ["RETAIN_OCR_NORMALIZED_DOCUMENT_JSON"])
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({
    "schema": "normalized_document_v1",
    "schema_version": "1.1",
    "document_id": "local-doc",
    "page_count": 1,
    "source": {"provider": "local"},
    "derived": {},
    "markers": {},
    "pages": [{
        "page_index": 0,
        "page": 1,
        "width": 320,
        "height": 480,
        "unit": "pt",
        "blocks": [{
            "block_id": "p001-b001",
            "page_index": 0,
            "order": 0,
            "type": "text",
            "sub_type": "body",
            "bbox": [72.0, 60.0, 220.0, 90.0],
            "text": "local ocr smoke",
            "geometry": {"bbox": [72.0, 60.0, 220.0, 90.0]},
            "content": {"kind": "text", "text": "local ocr smoke"},
            "layout_role": "paragraph",
            "semantic_role": "body",
            "structure_role": "body",
            "policy": {"translate": True, "translate_reason": "body"},
            "provenance": {"provider": "local", "raw_label": "text", "raw_sub_type": "body", "raw_bbox": [72.0, 60.0, 220.0, 90.0], "raw_path": "$.blocks[0]"},
            "continuation_hint": {"source": "", "group_id": "", "role": "single", "scope": "", "reading_order": 0, "confidence": 0.0},
            "metadata": {},
            "source": {"provider": "local", "raw_type": "text"},
            "lines": [],
            "segments": []
        }]
    }]
}, ensure_ascii=False), encoding="utf-8")
""".strip(),
        encoding="utf-8",
    )
    monkeypatch.setenv(LOCAL_OCR_COMMAND_ENV, f"{sys.executable} {script_path}")

    result = run_local_command_ocr_to_job_dir(
        SimpleNamespace(
            file_path=str(source_pdf),
            job_root=str(job_dirs.root),
            source_dir=str(job_dirs.source_dir),
            ocr_dir=str(job_dirs.ocr_dir),
            translated_dir=str(job_dirs.translated_dir),
            rendered_dir=str(job_dirs.rendered_dir),
            artifacts_dir=str(job_dirs.artifacts_dir),
            logs_dir=str(job_dirs.logs_dir),
        )
    )

    assert result.source_pdf_path == source_pdf
    assert result.normalized_json_path.exists()
    assert result.provider_result_json_path.exists()
    assert (job_dirs.ocr_dir / "normalized" / "document.v1.report.json").exists()
    normalized_payload = json.loads(result.normalized_json_path.read_text(encoding="utf-8"))
    assert normalized_payload["source"]["provider"] == "local"
