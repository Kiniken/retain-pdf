from __future__ import annotations

from dataclasses import dataclass

import pikepdf

from services.rendering.source_cleanup.pdf.hit_test import RectTuple
from services.rendering.source_cleanup.pdf.pdf_math import PdfMatrix
from services.rendering.source_cleanup.pdf.pdf_math import matrix_point
from services.rendering.source_cleanup.pdf.pdf_math import to_float


TEXT_SHOW_OPERATORS = {"Tj", "TJ", "'", '"'}
DEFAULT_TEXT_ADVANCE_PT = 18.0
MIN_TEXT_BOX_HEIGHT_PT = 2.0
TEXT_DEFAULT_RENDER_MODE = 0
DEFAULT_GLYPH_WIDTH_EM = 0.5


@dataclass(slots=True)
class TextState:
    font_size: float = 12.0
    char_spacing: float = 0.0
    word_spacing: float = 0.0
    horizontal_scaling: float = 1.0
    rise: float = 0.0
    render_mode: int = TEXT_DEFAULT_RENDER_MODE

    def copy(self) -> "TextState":
        return TextState(
            font_size=self.font_size,
            char_spacing=self.char_spacing,
            word_spacing=self.word_spacing,
            horizontal_scaling=self.horizontal_scaling,
            rise=self.rise,
            render_mode=self.render_mode,
        )

    def set_font_size(self, font_size: float) -> None:
        self.font_size = max(float(font_size), 0.1)

    def set_char_spacing(self, char_spacing: float) -> None:
        self.char_spacing = float(char_spacing)

    def set_word_spacing(self, word_spacing: float) -> None:
        self.word_spacing = float(word_spacing)

    def set_horizontal_scaling(self, percent: float) -> None:
        self.horizontal_scaling = max(float(percent) / 100.0, 0.01)

    def set_rise(self, rise: float) -> None:
        self.rise = float(rise)

    def set_render_mode(self, render_mode: int) -> None:
        self.render_mode = int(render_mode)


TextOperandMetrics = tuple[int, int, float]


def text_operand_length(operands: object) -> int:
    return text_operand_metrics(operands)[0]


def text_operand_profile(operands: object) -> tuple[int, int, float]:
    return text_operand_metrics(operands)


def text_operand_metrics(operands: object) -> TextOperandMetrics:
    if not operands:
        return (0, 0, 0.0)
    value = operands[-1] if len(operands) > 1 else operands[0]
    return _value_text_metrics(value)


def text_advance_tx(
    text_matrix: PdfMatrix,
    operands: object,
    *,
    text_length: int | None = None,
    text_metrics: TextOperandMetrics | None = None,
    text_state: TextState | None = None,
) -> float:
    state = text_state or TextState(font_size=max(abs(text_matrix[0]), 1.0))
    metrics = text_metrics or text_operand_metrics(operands)
    text_length = metrics[0] if text_length is None else text_length
    glyph_advance = text_length * state.font_size * DEFAULT_GLYPH_WIDTH_EM
    spacing_advance = text_length * state.char_spacing + metrics[1] * state.word_spacing
    adjustment_advance = -metrics[2] * state.font_size / 1000.0
    tx = max(0.0, (glyph_advance + spacing_advance + adjustment_advance) * state.horizontal_scaling)
    return max(1.0, tx)


def invisible_text_advance_operands(
    text_matrix: PdfMatrix,
    operands: object,
    *,
    text_metrics: TextOperandMetrics | None = None,
    text_state: TextState | None = None,
) -> pikepdf.Array:
    state = text_state or TextState(font_size=max(abs(text_matrix[0]), 1.0))
    metrics = text_metrics or text_operand_metrics(operands)
    advance = text_advance_tx(
        text_matrix,
        operands,
        text_metrics=metrics,
        text_state=state,
    )
    adjustment = -advance * 1000.0 / (
        max(state.font_size, 0.1) * max(state.horizontal_scaling, 0.01)
    )
    return pikepdf.Array([round(adjustment, 3)])


def estimated_text_rect(
    matrix: PdfMatrix,
    *,
    text_length: int,
    text_state: TextState | None = None,
) -> RectTuple:
    x, y = matrix_point(matrix)
    state = text_state or TextState()
    effective_font_size = max(abs(matrix[0]), abs(matrix[1]), abs(matrix[2]), abs(matrix[3]), state.font_size)
    font_height = max(abs(matrix[3]), abs(matrix[1]), effective_font_size, MIN_TEXT_BOX_HEIGHT_PT)
    char_width = max(effective_font_size * state.horizontal_scaling * DEFAULT_GLYPH_WIDTH_EM, 1.0)
    width = max(char_width, char_width * max(text_length, 1))
    return (x, y - font_height * 0.35, x + width, y + font_height * 1.05)


def estimated_user_text_geometry(
    ctm: PdfMatrix,
    text_matrix: PdfMatrix,
    text_state: TextState,
    *,
    text_length: int,
) -> tuple[tuple[float, float], RectTuple]:
    a, b, c, d, e, f = text_matrix
    font_width = text_state.font_size * text_state.horizontal_scaling
    font_height = text_state.font_size
    rise = text_state.rise
    user_a = ctm[0] * (a * font_width) + ctm[2] * (b * font_width)
    user_b = ctm[1] * (a * font_width) + ctm[3] * (b * font_width)
    user_c = ctm[0] * (c * font_height) + ctm[2] * (d * font_height)
    user_d = ctm[1] * (c * font_height) + ctm[3] * (d * font_height)
    user_x = ctm[0] * (c * rise + e) + ctm[2] * (d * rise + f) + ctm[4]
    user_y = ctm[1] * (c * rise + e) + ctm[3] * (d * rise + f) + ctm[5]
    rect = estimated_text_rect(
        (user_a, user_b, user_c, user_d, user_x, user_y),
        text_length=text_length,
        text_state=text_state,
    )
    return (user_x, user_y), rect


def _value_text_metrics(value: object) -> TextOperandMetrics:
    if isinstance(value, (str, bytes, pikepdf.String)):
        return _string_text_metrics(value)
    if isinstance(value, pikepdf.Array):
        chars = 0
        spaces = 0
        adjustment = 0.0
        for item in value:
            if isinstance(item, (str, bytes, pikepdf.String)):
                item_chars, item_spaces, _item_adjustment = _string_text_metrics(item)
                chars += item_chars
                spaces += item_spaces
            else:
                adjustment += to_float(item)
        return (chars, spaces, adjustment)
    return (1, 0, 0.0)


def _string_text_metrics(value: object) -> TextOperandMetrics:
    text = str(value)
    raw_byte_count = _pdf_string_byte_count(value)
    if raw_byte_count >= 2 and _looks_like_two_byte_cid_string(text, raw_byte_count):
        return (max(1, raw_byte_count // 2), 0, 0.0)
    return (len(text), text.count(" "), 0.0)


def _pdf_string_byte_count(value: object) -> int:
    if isinstance(value, bytes):
        return len(value)
    unparse = getattr(value, "unparse", None)
    if callable(unparse):
        try:
            raw = bytes(unparse())
        except Exception:
            raw = b""
        if raw.startswith(b"<") and raw.endswith(b">") and not raw.startswith(b"<<"):
            return max(0, (len(raw) - 2) // 2)
    return len(str(value).encode("latin-1", errors="ignore"))


def _looks_like_two_byte_cid_string(text: str, raw_byte_count: int) -> bool:
    if raw_byte_count % 2 != 0:
        return False
    if len(text) != raw_byte_count:
        return False
    pairs = [text[index : index + 2] for index in range(0, len(text), 2)]
    return bool(pairs) and sum(1 for pair in pairs if pair[:1] == "\x00") / len(pairs) >= 0.6


__all__ = [
    "TEXT_DEFAULT_RENDER_MODE",
    "TEXT_SHOW_OPERATORS",
    "TextOperandMetrics",
    "TextState",
    "estimated_text_rect",
    "invisible_text_advance_operands",
    "text_advance_tx",
    "text_operand_length",
    "text_operand_metrics",
    "text_operand_profile",
    "estimated_user_text_geometry",
]
