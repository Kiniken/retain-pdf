from __future__ import annotations

import fitz
import pikepdf

from services.rendering.source_cleanup.execution_policy import PageCleanupExecutionPolicy
from services.rendering.source_cleanup.pdf.hit_test import RectIndex
from services.rendering.source_cleanup.pdf.path_removal import PATH_CONSTRUCTION_OPERATORS
from services.rendering.source_cleanup.pdf.path_removal import PATH_PAINT_OPERATORS
from services.rendering.source_cleanup.pdf.path_removal import PathTracker
from services.rendering.source_cleanup.pdf.path_removal import decide_path_paint_rewrite
from services.rendering.source_cleanup.pdf.pdf_math import IDENTITY_MATRIX
from services.rendering.source_cleanup.pdf.pdf_math import PdfMatrix
from services.rendering.source_cleanup.pdf.text_ops import TEXT_SHOW_OPERATORS
from services.rendering.source_cleanup.pdf.text_ops import invisible_text_advance_operands
from services.rendering.source_cleanup.pdf.stream_state import ContentStreamState
from services.rendering.source_cleanup.pdf.text_removal import decide_text_show_rewrite
from services.rendering.source_cleanup.pdf.xobject_ops import rewrite_xobject_do
from services.rendering.source_cleanup.pdf.xobject_ops import xobject_dict


def strip_bbox_text_from_page(
    page: pikepdf.Page,
    rects: list[fitz.Rect],
    *,
    pdf: pikepdf.Pdf | None = None,
    protected_rects: list[fitz.Rect] | None = None,
    recurse_forms: bool = True,
    execution_policy: PageCleanupExecutionPolicy | None = None,
) -> tuple[bytes | None, int, int]:
    return strip_bbox_text_from_stream(
        page,
        rects,
        pdf=pdf,
        protected_rects=protected_rects,
        recurse_forms=recurse_forms,
        execution_policy=execution_policy,
    )


def strip_bbox_text_from_content_bytes(
    content_stream: bytes,
    rects: list[fitz.Rect],
    *,
    protected_rects: list[fitz.Rect] | None = None,
    execution_policy: PageCleanupExecutionPolicy | None = None,
) -> tuple[bytes | None, int, int]:
    pdf = pikepdf.Pdf.new()
    stream = pdf.make_stream(content_stream)
    try:
        return strip_bbox_text_from_stream(
            stream,
            rects,
            pdf=None,
            protected_rects=protected_rects,
            recurse_forms=False,
            execution_policy=execution_policy,
        )
    finally:
        pdf.close()


def strip_bbox_text_from_stream(
    stream_obj: pikepdf.Page | pikepdf.Object,
    rects: list[fitz.Rect],
    *,
    pdf: pikepdf.Pdf | None = None,
    protected_rects: list[fitz.Rect] | None = None,
    recurse_forms: bool = True,
    initial_ctm: PdfMatrix = IDENTITY_MATRIX,
    visited_forms: set[tuple[int, int]] | None = None,
    execution_policy: PageCleanupExecutionPolicy | None = None,
) -> tuple[bytes | None, int, int]:
    parsed_instructions = pikepdf.parse_content_stream(stream_obj)
    instructions = parsed_instructions if isinstance(parsed_instructions, list) else list(parsed_instructions)
    if not instructions or not rects:
        return None, 0, 0

    output: list[tuple] = []
    protected_rects = protected_rects or []
    strip_index = RectIndex.build(rects)
    protected_index = RectIndex.build(protected_rects)
    path_removal_index = RectIndex.build(
        execution_policy.path_removal_rects
        if execution_policy is not None
        else rects
    )
    removed = 0
    path_removed = 0
    forms_changed = 0
    state = ContentStreamState(ctm=initial_ctm)
    path_tracker = PathTracker.empty()
    pending_path_ops: list[tuple] = []

    xobjects = xobject_dict(stream_obj)

    for operands, operator in instructions:
        op = str(operator)
        if state.apply_state_operator(op, operands):
            output.append((operands, operator))
            continue
        if op == "Do" and operands:
            xobject_result = rewrite_xobject_do(
                operands=operands,
                xobjects=xobjects,
                rects=rects,
                pdf=pdf,
                protected_rects=protected_rects,
                recurse_forms=recurse_forms,
                ctm=state.ctm,
                visited_forms=visited_forms,
                rewrite_stream=_rewrite_stream_for_form,
                execution_policy=execution_policy,
            )
            operands = xobject_result.operands
            removed += xobject_result.removed
            forms_changed += xobject_result.forms_changed
            output.append((operands, operator))
            continue
        if op in {"'", '"'}:
            state.prepare_quote_text_show(op, operands)

        if op in TEXT_SHOW_OPERATORS:
            text_decision = decide_text_show_rewrite(
                operands=operands,
                ctm=state.ctm,
                text_matrix=state.text_matrix,
                text_state=state.text_state,
                strip_index=strip_index,
                protected_index=protected_index,
            )
            invisible_advance = invisible_text_advance_operands(
                state.text_matrix,
                operands,
                text_metrics=text_decision.text_metrics,
                text_state=state.text_state,
            )
            state.advance_text(operands, text_metrics=text_decision.text_metrics)
            if text_decision.remove:
                output.extend(_removed_text_show_side_effect_ops(op, operands))
                output.append(
                    (
                        [invisible_advance],
                        pikepdf.Operator("TJ"),
                    )
                )
                removed += 1
                continue

        if op in PATH_CONSTRUCTION_OPERATORS:
            path_tracker.record(op, operands, state.ctm)
            pending_path_ops.append((operands, operator))
            continue

        if op in PATH_PAINT_OPERATORS and pending_path_ops:
            path_decision = decide_path_paint_rewrite(
                op=op,
                path_rect=path_tracker.rect(),
                strip_index=strip_index,
                protected_index=protected_index,
                path_removal_index=path_removal_index,
                require_path_authorization=execution_policy is not None,
            )
            path_tracker.clear()
            if path_decision.remove:
                pending_path_ops.clear()
                path_removed += 1
                continue
            output.extend(pending_path_ops)
            pending_path_ops.clear()

        output.append((operands, operator))

    output.extend(pending_path_ops)
    removed += path_removed
    if removed <= 0:
        return None, 0, forms_changed
    return pikepdf.unparse_content_stream(output), removed, forms_changed


def _rewrite_stream_for_form(
    stream_obj: pikepdf.Object,
    rects: list[fitz.Rect],
    pdf: pikepdf.Pdf,
    protected_rects: list[fitz.Rect],
    recurse_forms: bool,
    initial_ctm: PdfMatrix,
    visited_forms: set[tuple[int, int]],
    execution_policy: PageCleanupExecutionPolicy | None = None,
) -> tuple[bytes | None, int, int]:
    return strip_bbox_text_from_stream(
        stream_obj,
        rects,
        pdf=pdf,
        protected_rects=protected_rects,
        recurse_forms=recurse_forms,
        initial_ctm=initial_ctm,
        visited_forms=visited_forms,
        execution_policy=execution_policy,
    )


def _removed_text_show_side_effect_ops(op: str, operands: object) -> list[tuple]:
    if op == "'":
        return [([], pikepdf.Operator("T*"))]
    if op == '"' and len(operands) >= 3:
        return [
            ([operands[0]], pikepdf.Operator("Tw")),
            ([operands[1]], pikepdf.Operator("Tc")),
            ([], pikepdf.Operator("T*")),
        ]
    return []
