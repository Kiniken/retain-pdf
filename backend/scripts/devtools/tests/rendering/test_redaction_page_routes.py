from __future__ import annotations

import sys
from pathlib import Path

import fitz


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from services.rendering.source.cleanup import routes


class _FakePage:
    def __init__(self) -> None:
        self.redact_annots: list[tuple[fitz.Rect, object]] = []
        self.redaction_calls: list[dict[str, object]] = []

    def add_redact_annot(self, rect: fitz.Rect, fill=None) -> None:
        self.redact_annots.append((rect, fill))

    def apply_redactions(self, *, images, graphics, text) -> None:
        self.redaction_calls.append(
            {
                "images": images,
                "graphics": graphics,
                "text": text,
            }
        )


def test_apply_image_page_redaction_never_redacts_pixels_or_line_art(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [(rect, {"item_id": "p010-b002"}, "中文")]
    prepared: list[fitz.Rect] = []
    applied: list[list[fitz.Rect]] = []

    monkeypatch.setattr(routes, "prepare_background_covers", lambda _page, rects: prepared.extend(rects) or ["cover"])
    monkeypatch.setattr(routes, "apply_prepared_background_covers", lambda _page, covers: applied.append(covers))

    diagnostics = routes.apply_image_page_redaction(page, valid_items)

    assert diagnostics["route"] == "image_page_redaction"
    assert prepared == [rect]
    assert applied == [["cover"]]
    assert page.redact_annots == [(rect, False)]
    assert page.redaction_calls == [
        {
            "images": fitz.PDF_REDACT_IMAGE_NONE,
            "graphics": fitz.PDF_REDACT_LINE_ART_NONE,
            "text": fitz.PDF_REDACT_TEXT_REMOVE,
        }
    ]


def test_apply_vector_heavy_redaction_never_redacts_pixels_or_line_art(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [(rect, {"item_id": "p010-b002"}, "中文")]
    covered_rects: list[fitz.Rect] = []

    monkeypatch.setattr(routes, "draw_white_covers", lambda _page, rects: covered_rects.extend(rects))

    diagnostics = routes.apply_vector_heavy_redaction(page, valid_items)

    assert diagnostics["route"] == "vector_heavy_redaction"
    assert covered_rects == [rect]
    assert page.redact_annots == [(rect, False)]
    assert page.redaction_calls == [
        {
            "images": fitz.PDF_REDACT_IMAGE_NONE,
            "graphics": fitz.PDF_REDACT_LINE_ART_NONE,
            "text": fitz.PDF_REDACT_TEXT_REMOVE,
        }
    ]
