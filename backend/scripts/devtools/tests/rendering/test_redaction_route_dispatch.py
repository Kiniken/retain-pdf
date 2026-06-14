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


def test_apply_redaction_route_cover_only_defaults_to_visual_cover(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [(rect, {"item_id": "p010-b002"}, "中文")]
    covered_rects: list[fitz.Rect] = []

    monkeypatch.setattr(
        routes,
        "draw_flat_white_covers",
        lambda _page, rects: covered_rects.extend(rects),
    )

    diagnostics = routes.apply_redaction_route(page, valid_items, cover_only=True)

    assert diagnostics["route"] == "visual_cover"
    assert diagnostics["strategy"] == "visual_cover"
    assert diagnostics["fast_page_cover_only"] is True
    assert covered_rects == [rect]
    assert page.redact_annots == []
    assert page.redaction_calls == []


def test_apply_redaction_route_legacy_visual_and_text_removes_text_layer(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [(rect, {"item_id": "p010-b002"}, "中文")]
    covered_rects: list[fitz.Rect] = []

    monkeypatch.setattr(
        routes,
        "draw_white_covers",
        lambda _page, rects: covered_rects.extend(rects),
    )

    diagnostics = routes.apply_redaction_route(page, valid_items, strategy="visual_and_text")

    assert diagnostics["route"] == "visual_cover_and_remove_text"
    assert diagnostics["strategy"] == "visual_cover_and_remove_text"
    assert covered_rects == [rect]
    assert page.redact_annots == [(rect, False)]
    assert page.redaction_calls == [
        {
            "images": fitz.PDF_REDACT_IMAGE_NONE,
            "graphics": fitz.PDF_REDACT_LINE_ART_NONE,
            "text": fitz.PDF_REDACT_TEXT_REMOVE,
        }
    ]


def test_apply_redaction_route_accepts_stable_strategy_names(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [(rect, {"item_id": "p010-b002"}, "中文")]
    covered_rects: list[fitz.Rect] = []

    monkeypatch.setattr(
        routes,
        "draw_white_covers",
        lambda _page, rects: covered_rects.extend(rects),
    )

    diagnostics = routes.apply_redaction_route(page, valid_items, strategy="visual_cover")

    assert diagnostics["route"] == "visual_cover"
    assert diagnostics["strategy"] == "visual_cover"
    assert covered_rects == [rect]


def test_apply_redaction_route_auto_removes_safe_plain_text_layer(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    removable_rect = fitz.Rect(24, 24, 110, 54)
    valid_items = [
        (
            rect,
            {
                "item_id": "p010-b002",
                "block_kind": "text",
                "block_type": "text",
                "layout_role": "paragraph",
                "semantic_role": "body",
                "structure_role": "body",
                "source_text": "This is a long body paragraph that should be eligible for source cleanup.",
                "bbox": [20, 20, 120, 60],
            },
            "中文",
        )
    ]
    covered_rects: list[fitz.Rect] = []

    monkeypatch.setattr(routes, "draw_white_covers", lambda _page, rects: covered_rects.extend(rects))
    monkeypatch.setattr(routes, "collect_page_math_protection_rects", lambda _page: [])
    monkeypatch.setattr(routes, "collect_page_non_math_span_heights", lambda _page: [])
    monkeypatch.setattr(routes, "page_has_intrusive_math_protection", lambda *_args: False)
    monkeypatch.setattr(routes, "item_removable_text_rects", lambda _page, _item, _rect, **_kwargs: [removable_rect])

    diagnostics = routes.apply_redaction_route(page, valid_items)

    assert diagnostics["route"] == "auto"
    assert diagnostics["strategy"] == "auto"
    assert diagnostics["raw_removable_rects"] == 1
    assert diagnostics["merged_removable_rects"] == 1
    assert covered_rects == []
    assert diagnostics["cover_rects"] == 0
    assert diagnostics["fast_page_cover_only"] is False
    assert page.redact_annots == [(removable_rect, False)]
    assert page.redaction_calls == [
        {
            "images": fitz.PDF_REDACT_IMAGE_NONE,
            "graphics": fitz.PDF_REDACT_LINE_ART_NONE,
            "text": fitz.PDF_REDACT_TEXT_REMOVE,
        }
    ]


def test_apply_redaction_route_auto_uses_safe_text_cleanup_for_formula_item(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [
        (
            rect,
            {
                "item_id": "p010-b002",
                "block_kind": "text",
                "block_type": "text",
                "layout_role": "paragraph",
                "semantic_role": "body",
                "structure_role": "body",
                "source_text": (
                    "This is a long enough body paragraph containing an inline formula [[FORMULA_1]] "
                    "that should be treated as body text but skipped by risky formula cleanup."
                ),
                "bbox": [20, 20, 120, 60],
                "formula_map": [{"placeholder": "[[FORMULA_1]]", "formula_text": "x^2"}],
            },
            "中文 [[FORMULA_1]]",
        )
    ]
    covered_rects: list[fitz.Rect] = []
    removable_rect = fitz.Rect(24, 24, 95, 54)

    def _removable_call(_page, _item, _rect, **kwargs):
        assert kwargs.get("special_math_rects") is None
        return [removable_rect]

    monkeypatch.setattr(routes, "draw_white_covers", lambda _page, rects: covered_rects.extend(rects))
    monkeypatch.setattr(routes, "collect_page_math_protection_rects", lambda _page: [])
    monkeypatch.setattr(routes, "collect_page_non_math_span_heights", lambda _page: [])
    monkeypatch.setattr(routes, "page_has_intrusive_math_protection", lambda *_args: False)
    monkeypatch.setattr(routes, "item_removable_text_rects", _removable_call)

    diagnostics = routes.apply_redaction_route(page, valid_items)

    assert diagnostics["route"] == "auto"
    assert diagnostics["strategy"] == "auto"
    assert diagnostics["auto_text_cleanup_items_skipped"] == 0
    assert diagnostics["raw_removable_rects"] == 1
    assert diagnostics["cover_rects"] == 0
    assert diagnostics["fast_page_cover_only"] is False
    assert covered_rects == []
    assert page.redact_annots == [(removable_rect, False)]
    assert page.redaction_calls == [
        {
            "images": fitz.PDF_REDACT_IMAGE_NONE,
            "graphics": fitz.PDF_REDACT_LINE_ART_NONE,
            "text": fitz.PDF_REDACT_TEXT_REMOVE,
        }
    ]


def test_apply_redaction_route_auto_covers_explicit_render_blocks(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 160, 42)
    valid_items = [
        (
            rect,
            {
                "item_id": "item-3",
                "block_kind": "render_block",
                "block_type": "render_block",
                "source_text": "Fig. 1. A figure caption should be covered when it is actually rendered.",
                "bbox": [20, 20, 160, 42],
            },
            "图1. 图注实际渲染时应该触发源页面遮盖。",
        )
    ]
    covered_rects: list[fitz.Rect] = []

    monkeypatch.setattr(routes, "draw_white_covers", lambda _page, rects: covered_rects.extend(rects))
    monkeypatch.setattr(routes, "collect_page_math_protection_rects", lambda _page: [])
    monkeypatch.setattr(routes, "collect_page_non_math_span_heights", lambda _page: [])
    monkeypatch.setattr(routes, "page_has_intrusive_math_protection", lambda *_args: False)

    diagnostics = routes.apply_redaction_route(page, valid_items)

    assert diagnostics["route"] == "auto"
    assert diagnostics["strategy"] == "auto"
    assert diagnostics["cover_rects"] == 1
    assert diagnostics["fast_page_cover_only"] is True
    assert covered_rects == [rect]
    assert page.redact_annots == []
    assert page.redaction_calls == []


def test_apply_redaction_route_auto_filters_text_cleanup_with_intrusive_math_page(monkeypatch) -> None:
    page = _FakePage()
    rect = fitz.Rect(20, 20, 120, 60)
    valid_items = [
        (
            rect,
            {
                "item_id": "p010-b002",
                "block_kind": "text",
                "block_type": "text",
                "layout_role": "paragraph",
                "semantic_role": "body",
                "structure_role": "body",
                "source_text": "This is a long body paragraph that should normally be redacted.",
                "bbox": [20, 20, 120, 60],
            },
            "中文",
        )
    ]
    covered_rects: list[fitz.Rect] = []
    math_rect = fitz.Rect(50, 25, 80, 45)
    removable_rect = fitz.Rect(24, 24, 45, 54)

    def _removable_call(_page, _item, _rect, **kwargs):
        assert kwargs.get("special_math_rects") == [math_rect]
        return [removable_rect]

    monkeypatch.setattr(routes, "draw_white_covers", lambda _page, rects: covered_rects.extend(rects))
    monkeypatch.setattr(routes, "collect_page_math_protection_rects", lambda _page: [math_rect])
    monkeypatch.setattr(routes, "collect_page_non_math_span_heights", lambda _page: [])
    monkeypatch.setattr(routes, "page_has_intrusive_math_protection", lambda *_args: True)
    monkeypatch.setattr(routes, "item_removable_text_rects", _removable_call)

    diagnostics = routes.apply_redaction_route(page, valid_items)

    assert diagnostics["route"] == "auto"
    assert diagnostics["strategy"] == "auto"
    assert diagnostics["auto_text_cleanup_math_protected"] is True
    assert diagnostics["auto_text_cleanup_items_skipped"] == 0
    assert diagnostics["raw_removable_rects"] == 1
    assert diagnostics["cover_rects"] == 0
    assert diagnostics["fast_page_cover_only"] is False
    assert covered_rects == []
    assert page.redact_annots == [(removable_rect, False)]
    assert page.redaction_calls == [
        {
            "images": fitz.PDF_REDACT_IMAGE_NONE,
            "graphics": fitz.PDF_REDACT_LINE_ART_NONE,
            "text": fitz.PDF_REDACT_TEXT_REMOVE,
        }
    ]
