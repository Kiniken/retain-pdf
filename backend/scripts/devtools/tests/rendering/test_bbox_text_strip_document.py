from __future__ import annotations

import sys
import tempfile
import json
from pathlib import Path

import fitz
import pikepdf
import pytest
from pikepdf import Name


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from services.rendering.source_cleanup.pdf import document as source_cleanup_document
from services.rendering.source_cleanup import build_bbox_text_stripped_pdf_copy
from services.rendering.source_cleanup import strip_bbox_text_rects_from_pdf_copy
from services.rendering.source_cleanup.planning import segments


def test_bbox_text_strip_segments_keep_inline_formula_sides_deletable() -> None:
    text_rect = fitz.Rect(10, 20, 210, 50)
    formula_rect = fitz.Rect(80, 22, 140, 48)

    split_segments = segments.strip_segments_for_text_rect(text_rect, [formula_rect])

    assert len(split_segments) == 2
    assert split_segments[0].x0 <= 10
    assert split_segments[0].x1 <= formula_rect.x0
    assert split_segments[1].x0 >= formula_rect.x1
    assert split_segments[1].x1 >= 210
    assert all((segment & formula_rect).is_empty for segment in split_segments)


def test_bbox_text_strip_cid_word_width_does_not_hit_neighbor_protected_column() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(400, 800))
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 1 Tf 1 0 0 1 254 733 Tm <0012001500070006000e000a0008000c0004000b> TJ ET\n"
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
        pdf.save(source_pdf)

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(240.0, 720.0, 280.0, 745.0)]},
            page_protected_rects={0: [fitz.Rect(269.0, 720.0, 330.0, 745.0)]},
        )

        assert result.changed is True
        assert result.text_show_ops_removed == 1


def test_bbox_text_strip_preserves_explicit_protected_source_blocks() -> None:
    job = Path("data/jobs/20260607133703-aa37db")
    source_pdf = next((job / "source").glob("*.pdf"), None)
    translated_path = job / "translated/page-009-deepseek.json"
    normalized_path = job / "ocr/normalized/document.v1.json"
    if source_pdf is None or not translated_path.exists() or not normalized_path.exists():
        pytest.skip("sample job is not available")

    from services.rendering.source_cleanup.protected_blocks import protected_pages_from_document_path

    with tempfile.TemporaryDirectory() as tmp:
        output_pdf = Path(tmp) / "stripped.pdf"
        translated_items = json.loads(translated_path.read_text(encoding="utf-8"))
        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={8: translated_items},
            protected_pages=protected_pages_from_document_path(normalized_path),
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[8].get_text()
        finally:
            stripped.close()
        assert "The Supporting Information is available free of charge at" in text


def test_protected_source_blocks_exclude_translated_json_owned_regions() -> None:
    from services.rendering.source_cleanup.protected_blocks import protected_pages_from_document

    normalized_document = {
        "schema": "normalized_document_v1",
        "pages": [
            {
                "page_index": 0,
                "blocks": [
                    {
                        "block_id": "ocr-body",
                        "bbox": [10.0, 20.0, 180.0, 55.0],
                        "content": {"kind": "text", "text": "English body text"},
                        "policy": {"translate": False},
                    },
                    {
                        "block_id": "ocr-metadata",
                        "bbox": [10.0, 100.0, 180.0, 130.0],
                        "content": {"kind": "text", "text": "The Supporting Information is available free of charge at"},
                        "policy": {"translate": False},
                    },
                ],
            }
        ],
    }
    translated_pages = {
        0: [
            {
                "item_id": "p001-b001",
                "block_kind": "text",
                "bbox": [9.0, 19.0, 181.0, 56.0],
                "protected_translated_text": "中文正文",
            }
        ]
    }

    protected_pages = protected_pages_from_document(
        normalized_document,
        translated_pages=translated_pages,
    )

    assert [item["item_id"] for item in protected_pages[0]] == ["ocr-metadata"]


def test_bbox_text_strip_removes_text_inside_bbox_without_redaction_bloat() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside text", fontsize=12)
        page.insert_text((20, 140), "outside text", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
            skip_form_xobject_pages=True,
        )

        assert result.changed is True
        assert result.text_show_ops_removed >= 1

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "inside text" not in text
        assert "outside text" in text


def test_bbox_text_strip_preserves_text_block_with_embedded_display_formula() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=260, height=180)
        page.insert_text((30, 50), "body text", fontsize=12)
        page.insert_text((30, 90), "E = mc2", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "block_type": "text",
                        "bbox": [20.0, 30.0, 230.0, 105.0],
                        "source_text": "body text\n$$ E=mc^2 $$",
                        "protected_translated_text": "正文\n$$ E=mc^2 $$",
                        "lines": [
                            {"type": "text", "text": "body text"},
                            {"type": "display_formula", "text": "$$ E=mc^2 $$"},
                        ],
                    },
                ]
            },
        )

        assert result.changed is False
        assert output_pdf.exists() is False


def test_bbox_text_strip_does_not_protect_text_from_raw_adjacent_math_markers() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=260, height=180)
        page.insert_text((30, 50), "ss Delta alpha text", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "block_type": "text",
                        "bbox": [20.0, 30.0, 230.0, 70.0],
                        "source_text": r"ss$\Delta$$\alpha$ text",
                        "protected_translated_text": r"$ss\Delta\alpha$ 文本",
                    },
                ]
            },
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "Delta alpha text" not in text


def test_bbox_text_strip_keeps_source_text_when_no_translated_overlay() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside source", fontsize=12)
        page.insert_text((20, 140), "outside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_source_text": "inside source",
                        "protected_translated_text": "",
                    }
                ]
            },
        )

        assert result.changed is False
        assert output_pdf.exists() is False


def test_bbox_text_strip_keeps_non_translated_items_even_with_render_text() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "keep original", fontsize=12)
        page.insert_text((20, 140), "outside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_source_text": "keep original",
                        "protected_translated_text": "keep original",
                        "final_status": "kept_origin",
                        "decision": "keep_origin",
                    }
                ]
            },
        )

        assert result.changed is False
        assert output_pdf.exists() is False


def test_bbox_text_strip_skips_large_background_image_page_before_deletion() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 200, 200), False)
        pix.clear_with(255)
        page.insert_image(page.rect, pixmap=pix)
        page.insert_text((20, 40), "inside source", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 140.0, 55.0],
                        "protected_source_text": "inside source",
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is False
        assert result.changed_page_indices == frozenset()
        assert result.skipped_visual_background_page_indices == frozenset({0})
        assert output_pdf.exists() is False


def test_bbox_text_strip_keeps_body_text_deletable_when_vector_line_overlaps() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside text", fontsize=12)
        page.draw_line((12, 45), (150, 45), color=(0, 0, 0), width=1)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 160.0, 60.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is True
        assert output_pdf.exists() is True
        assert result.skipped_complex_page_indices == frozenset()


def test_bbox_text_strip_allows_fill_only_background_overlap() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=240, height=180)
        page.draw_rect(fitz.Rect(12, 25, 180, 75), color=None, fill=(1.0, 0.95, 0.82))
        page.insert_text((20, 50), "inside text", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 190.0, 80.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_complex_page_indices == frozenset()
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
            drawings = stripped[0].get_drawings()
        finally:
            stripped.close()
        assert "inside text" not in text
        assert drawings


def test_bbox_text_strip_allows_toc_leader_vector_overlap() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=260, height=180)
        page.insert_text((20, 50), "1.1 Introduction", fontsize=12)
        page.draw_line((120, 47), (210, 47), color=(0, 0, 0), width=0.5)
        page.insert_text((220, 50), "2", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "layout_role": "toc",
                        "semantic_role": "table_of_contents",
                        "structure_role": "table_of_contents",
                        "normalized_sub_type": "table_of_contents",
                        "bbox": [15.0, 30.0, 235.0, 60.0],
                        "protected_translated_text": "1.1 引言 ..... 2",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_complex_page_indices == frozenset()

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
            drawings = stripped[0].get_drawings()
        finally:
            stripped.close()
        assert "Introduction" not in text
        assert drawings


def test_bbox_text_strip_keeps_fast_path_when_vector_line_is_outside_text_bbox() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=200, height=200)
        page.insert_text((20, 40), "inside text", fontsize=12)
        page.draw_line((12, 120), (150, 120), color=(0, 0, 0), width=1)
        doc.save(source_pdf)
        doc.close()

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [10.0, 20.0, 160.0, 60.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.skipped_complex_page_indices == frozenset()

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "inside text" not in text


def test_strip_bbox_text_rects_from_pdf_copy_removes_text_without_translated_pages() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        doc = fitz.open()
        page = doc.new_page(width=240, height=180)
        page.insert_text((30, 50), "remove me", fontsize=12)
        page.insert_text((30, 100), "keep me", fontsize=12)
        doc.save(source_pdf)
        doc.close()

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(20.0, 115.0, 120.0, 150.0)]},
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "remove me" not in text
        assert "keep me" in text


def test_strip_bbox_text_rects_from_pdf_copy_removes_text_like_fill_paths() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(240, 180))
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 12 Tf 30 50 Td (remove me) Tj ET\n"
            b"q 0 0 0 rg 60 60 m 65 60 l 65 70 l 60 70 l h f Q\n"
            b"q 0 0 0 rg 160 120 m 165 120 l 165 130 l 160 130 l h f Q\n"
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
        pdf.save(source_pdf)

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(20.0, 35.0, 100.0, 80.0)]},
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            bboxlog = stripped[0].get_bboxlog()
        finally:
            stripped.close()
        assert not any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(20, 35, 100, 80)) for kind, rect in bboxlog)
        assert any(kind == "fill-path" and fitz.Rect(rect).intersects(fitz.Rect(150, 40, 180, 70)) for kind, rect in bboxlog)


def test_strip_bbox_text_preserves_text_advance_after_removed_show_ops() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(260, 160))
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 12 Tf 30 80 Td (REMOVE) Tj (KEEP) Tj ET\n"
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
        pdf.save(source_pdf)

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(25.0, 65.0, 60.0, 95.0)]},
        )

        assert result.changed is True
        stripped = fitz.open(output_pdf)
        try:
            page_text = stripped[0].get_text()
            removed_clip = stripped[0].get_text("text", clip=fitz.Rect(25.0, 65.0, 60.0, 95.0))
        finally:
            stripped.close()

        assert "REMOVE" not in page_text
        assert "KEEP" in page_text
        assert "REMOVE" not in removed_clip
