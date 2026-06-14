from __future__ import annotations

import sys
from pathlib import Path

import pikepdf
import pytest


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from services.rendering.source_cleanup.pdf import pdf_math
from services.rendering.source_cleanup.pdf import text_ops
from services.rendering.source_cleanup.pdf.stream_engine import strip_bbox_text_from_content_bytes
from services.rendering.source_cleanup.pdf.hit_test import RectIndex


def test_text_strip_hit_test_ignores_tiny_edge_intersections() -> None:
    strip_index = RectIndex.build([(100.0, 100.0, 160.0, 120.0)])

    assert strip_index.matches_text_for_removal(
        20.0,
        110.0,
        (20.0, 100.0, 101.0, 120.0),
    ) is False
    assert strip_index.matches_text_for_removal(
        20.0,
        110.0,
        (20.0, 100.0, 145.0, 120.0),
    ) is True
    assert strip_index.matches_text_for_removal(
        120.0,
        110.0,
        (20.0, 100.0, 101.0, 120.0),
    ) is True


def test_cid_hex_text_metrics_count_two_byte_glyphs() -> None:
    cid_string = pikepdf.String(bytes.fromhex("0012001500070006000e000a0008000c0004000b"))

    chars, spaces, adjustment = text_ops.text_operand_metrics([pikepdf.Array([cid_string])])

    assert chars == 10
    assert spaces == 0
    assert adjustment == 0.0


def test_text_state_advance_uses_font_size_spacing_and_tj_adjustments() -> None:
    state = text_ops.TextState(font_size=12.0, char_spacing=1.0, word_spacing=3.0)

    plain = text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, ["hello"], text_state=state)
    with_space = text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, ["a b"], text_state=state)
    with_tj_pull = text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, [pikepdf.Array(["a", -120, "b"])], text_state=state)

    assert plain == pytest.approx(35.0)
    assert with_space == pytest.approx(24.0)
    assert with_tj_pull > text_ops.text_advance_tx(pdf_math.IDENTITY_MATRIX, ["ab"], text_state=state)


def test_estimated_text_rect_uses_font_size_from_text_state() -> None:
    state = text_ops.TextState(font_size=12.0)
    _point, rect = text_ops.estimated_user_text_geometry(
        pdf_math.IDENTITY_MATRIX,
        (1, 0, 0, 1, 20, 40),
        state,
        text_length=4,
    )

    assert rect[0] == pytest.approx(20.0)
    assert rect[1] < 40.0
    assert rect[2] >= 44.0
    assert rect[3] > 50.0


def test_text_strip_preserves_text_advance_for_following_show_ops() -> None:
    content = b"""
BT
/F1 12 Tf
1 0 0 1 20 40 Tm
(remove) Tj
(keep) Tj
ET
"""

    rewritten, removed, _forms_changed = strip_bbox_text_from_content_bytes(
        content,
        [pytest.importorskip("fitz").Rect(15.0, 25.0, 50.0, 60.0)],
    )

    assert removed == 1
    assert rewritten is not None
    assert b"(remove)" not in rewritten
    assert b"6b656570" in rewritten
    assert b"TJ" in rewritten


def test_text_strip_skips_partial_text_show_overlap() -> None:
    content = b"""
BT
/F1 12 Tf
1 0 0 1 20 40 Tm
(REMOVEKEEP) Tj
ET
"""

    rewritten, removed, _forms_changed = strip_bbox_text_from_content_bytes(
        content,
        [pytest.importorskip("fitz").Rect(15.0, 25.0, 56.0, 60.0)],
    )

    assert removed == 0
    assert rewritten is None


def test_text_strip_removes_whole_text_show_when_mostly_covered() -> None:
    content = b"""
BT
/F1 12 Tf
1 0 0 1 20 40 Tm
(REMOVEKEEP) Tj
ET
"""

    rewritten, removed, _forms_changed = strip_bbox_text_from_content_bytes(
        content,
        [pytest.importorskip("fitz").Rect(15.0, 25.0, 95.0, 60.0)],
    )

    assert removed == 1
    assert rewritten is not None
    assert b"52454d4f5645" not in rewritten
    assert b"TJ" in rewritten


def test_text_strip_skips_partial_tj_array_overlap() -> None:
    content = b"""
BT
/F1 12 Tf
1 0 0 1 20 40 Tm
[(KEEP) -20 (REMOVE) -20 (STAY)] TJ
ET
"""

    rewritten, removed, _forms_changed = strip_bbox_text_from_content_bytes(
        content,
        [pytest.importorskip("fitz").Rect(44.5, 25.0, 80.8, 60.0)],
    )

    assert removed == 0
    assert rewritten is None


def test_text_strip_protected_rect_blocks_whole_text_show_removal() -> None:
    content = b"""
BT
/F1 12 Tf
1 0 0 1 20 40 Tm
(TEXTFORMULATEXT) Tj
ET
"""
    fitz = pytest.importorskip("fitz")

    rewritten, removed, _forms_changed = strip_bbox_text_from_content_bytes(
        content,
        [fitz.Rect(15.0, 25.0, 120.0, 60.0)],
        protected_rects=[fitz.Rect(45.0, 25.0, 84.0, 60.0)],
    )

    assert removed == 0
    assert rewritten is None
