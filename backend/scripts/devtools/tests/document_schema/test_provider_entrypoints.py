from __future__ import annotations

from pathlib import Path


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]


def test_run_provider_ocr_entrypoint_targets_provider_pipeline() -> None:
    entrypoint_path = REPO_SCRIPTS_ROOT / "entrypoints" / "run_provider_ocr.py"
    source = entrypoint_path.read_text(encoding="utf-8")

    assert "from services.ocr_provider.provider_pipeline import main" in source
    assert "services.mineru.ocr_pipeline" not in source
