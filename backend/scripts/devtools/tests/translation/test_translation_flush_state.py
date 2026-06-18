from __future__ import annotations

import sys
from pathlib import Path


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from services.translation.services.results import flush as flush_module
from services.translation.services.results.flush import TranslationFlushState


def test_translation_batch_flush_skips_full_unit_refresh(monkeypatch, tmp_path: Path) -> None:
    calls: list[dict] = []

    def _save_pages(page_payloads, translation_paths, page_indices=None, *, refresh_units=True):
        calls.append(
            {
                "page_indices": set(page_indices or []),
                "refresh_units": refresh_units,
            }
        )

    monkeypatch.setattr(flush_module, "save_pages", _save_pages)

    state = TranslationFlushState(
        page_payloads={0: [{"item_id": "p001-b001"}], 1: [{"item_id": "p002-b001"}]},
        translation_paths={0: tmp_path / "page-001.json", 1: tmp_path / "page-002.json"},
        flush_interval=1,
        total_batches=2,
    )
    state.mark_dirty({1})
    state.flush(label="test flush")

    assert calls == [{"page_indices": {1}, "refresh_units": False}]
    assert state.stats()["flush_count"] == 1
    assert state.stats()["flushed_page_total"] == 1
    assert state.stats()["max_flush_pages"] == 1
    assert state.stats()["flush_elapsed_ms"] >= 0
