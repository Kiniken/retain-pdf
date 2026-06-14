from __future__ import annotations

DISPLAY_FORMULA_ROLE_TYPES = frozenset(
    {
        "formula",
        "math",
        "display_formula",
        "display_equation",
        "block_formula",
        "block_math",
    }
)


def item_has_unresolved_embedded_formula(item: dict) -> bool:
    return item_has_formula_role(item) or lines_have_formula_spans(item)


def lines_have_formula_spans(item: dict) -> bool:
    lines = item.get("lines")
    if not isinstance(lines, list):
        return False
    return any(line_has_formula_role(line) for line in lines if isinstance(line, dict))


def item_has_formula_role(item: dict) -> bool:
    return value_is_formula_role(
        item.get("type")
        or item.get("kind")
        or item.get("role")
        or item.get("block_kind")
        or item.get("block_type")
    )


def line_has_formula_role(line: dict) -> bool:
    if value_is_formula_role(line.get("type") or line.get("kind") or line.get("role")):
        return True
    spans = line.get("spans")
    if not isinstance(spans, list):
        return False
    return any(span_has_formula_role(span) for span in spans if isinstance(span, dict))


def span_has_formula_role(span: dict) -> bool:
    return value_is_formula_role(span.get("type") or span.get("kind") or span.get("role"))


def value_is_formula_role(value: object) -> bool:
    return str(value or "").strip().lower() in DISPLAY_FORMULA_ROLE_TYPES
