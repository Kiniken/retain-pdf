from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import fitz
import pikepdf
from pikepdf import Name


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from devtools.tests.rendering_support.page_profiles import sample_render_page_profile
from services.rendering.analysis.document.builder import build_render_page_analysis
from services.rendering.contracts import RenderDocumentAnalysis
from services.rendering.source.render_source import build_render_source_pdf
from services.rendering.source_cleanup import build_bbox_text_stripped_pdf_copy
from services.rendering.source_cleanup import strip_bbox_text_rects_from_pdf_copy


def test_bbox_text_strip_clones_shared_form_xobject_before_rewrite() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(240, 180))
        form = pdf.make_stream(b"BT /F1 12 Tf 0 0 Td (FORMTEXT) Tj ET")
        form[Name("/Type")] = Name("/XObject")
        form[Name("/Subtype")] = Name("/Form")
        form[Name("/BBox")] = pikepdf.Array([0, 0, 120, 30])
        form[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            XObject=pikepdf.Dictionary(Fm1=form)
        )
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"q 1 0 0 1 30 50 cm /Fm1 Do Q\n"
            b"q 1 0 0 1 30 120 cm /Fm1 Do Q\n"
        )
        pdf.save(source_pdf)

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(20.0, 40.0, 180.0, 75.0)]},
            recurse_forms=True,
        )

        assert result.changed is True
        assert result.forms_changed == 1

        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert text.count("FORMTEXT") == 1


def test_bbox_text_strip_executor_skips_form_xobject_pages_for_cover_fallback() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(240, 180))
        form = pdf.make_stream(b"BT /F1 12 Tf 0 0 Td (FORMTEXT) Tj ET")
        form[Name("/Type")] = Name("/XObject")
        form[Name("/Subtype")] = Name("/Form")
        form[Name("/BBox")] = pikepdf.Array([0, 0, 120, 30])
        form[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(
                F1=pikepdf.Dictionary(
                    Type=Name("/Font"),
                    Subtype=Name("/Type1"),
                    BaseFont=Name("/Helvetica"),
                )
            )
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(XObject=pikepdf.Dictionary(Fm1=form))
        page.obj[Name("/Contents")] = pdf.make_stream(b"q 1 0 0 1 30 50 cm /Fm1 Do Q\n")
        pdf.save(source_pdf)

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [20.0, 40.0, 180.0, 75.0],
                        "protected_translated_text": "译文",
                    }
                ]
            },
            skip_form_xobject_pages=True,
        )

        assert result.changed is False
        assert result.skipped_form_xobject_page_indices == frozenset({0})
        assert output_pdf.exists() is False


def test_bbox_text_strip_skips_form_recursion_but_keeps_page_text_fast_path() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(240, 180))
        form = pdf.make_stream(b"BT /F1 12 Tf 0 0 Td (FORMTEXT) Tj ET")
        form[Name("/Type")] = Name("/XObject")
        form[Name("/Subtype")] = Name("/Form")
        form[Name("/BBox")] = pikepdf.Array([0, 0, 120, 30])
        font = pikepdf.Dictionary(
            Type=Name("/Font"),
            Subtype=Name("/Type1"),
            BaseFont=Name("/Helvetica"),
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(F1=font),
            XObject=pikepdf.Dictionary(Fm1=form),
        )
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 12 Tf 30 50 Td (PAGETEXT) Tj ET\n"
            b"q 1 0 0 1 30 100 cm /Fm1 Do Q\n"
        )
        pdf.save(source_pdf)

        result = strip_bbox_text_rects_from_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            page_rects={0: [fitz.Rect(20.0, 35.0, 180.0, 70.0)]},
            recurse_forms=True,
            skip_form_xobject_pages=True,
        )

        assert result.changed is True
        assert result.skipped_form_xobject_page_indices == frozenset({0})
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "PAGETEXT" not in text
        assert "FORMTEXT" in text


def test_source_cleanup_default_recurses_form_xobjects_for_inline_formula_text() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "stripped.pdf"
        pdf = pikepdf.Pdf.new()
        page = pdf.add_blank_page(page_size=(240, 180))
        form = pdf.make_stream(b"BT /F1 12 Tf 0 0 Td (INLINEFORMULA) Tj ET")
        form[Name("/Type")] = Name("/XObject")
        form[Name("/Subtype")] = Name("/Form")
        form[Name("/BBox")] = pikepdf.Array([0, 0, 140, 30])
        font = pikepdf.Dictionary(
            Type=Name("/Font"),
            Subtype=Name("/Type1"),
            BaseFont=Name("/Helvetica"),
        )
        page.obj[Name("/Resources")] = pikepdf.Dictionary(
            Font=pikepdf.Dictionary(F1=font),
            XObject=pikepdf.Dictionary(Fm1=form),
        )
        page.obj[Name("/Contents")] = pdf.make_stream(
            b"BT /F1 12 Tf 30 50 Td (BODYTEXT) Tj ET\n"
            b"q 1 0 0 1 30 100 cm /Fm1 Do Q\n"
        )
        pdf.save(source_pdf)

        result = build_bbox_text_stripped_pdf_copy(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            translated_pages={
                0: [
                    {
                        "block_kind": "text",
                        "bbox": [20.0, 35.0, 180.0, 125.0],
                        "source_text": "BODYTEXT $ INLINEFORMULA $",
                        "protected_translated_text": "正文 $ INLINEFORMULA $",
                    }
                ]
            },
        )

        assert result.changed is True
        assert result.forms_changed >= 1
        assert result.skipped_form_xobject_page_indices == frozenset()
        stripped = fitz.open(output_pdf)
        try:
            text = stripped[0].get_text()
        finally:
            stripped.close()
        assert "BODYTEXT" not in text
        assert "INLINEFORMULA" not in text


def test_render_source_skips_physical_strip_when_document_analysis_requires_visual_cover() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        source_pdf = root / "source.pdf"
        output_pdf = root / "translated.pdf"
        doc = fitz.open()
        for _index in range(121):
            page = doc.new_page(width=120, height=120)
            page.insert_text((10, 30), "source", fontsize=10)
        doc.save(source_pdf)
        doc.close()

        translated_pages = {
            index: [
                {
                    "block_kind": "text",
                    "bbox": [5.0, 15.0, 90.0, 45.0],
                    "protected_translated_text": "译文",
                }
            ]
            for index in range(121)
        }

        result = build_render_source_pdf(
            source_pdf_path=source_pdf,
            output_pdf_path=output_pdf,
            pdf_compress_dpi=0,
            translated_pages=translated_pages,
            strip_hidden_text=False,
            artifact_mode=True,
            source_cleanup_strategy="pikepdf_text_strip",
            document_analysis=RenderDocumentAnalysis(
                pages={
                    index: build_render_page_analysis(sample_render_page_profile("scan_image"))
                    for index in translated_pages
                }
            ),
        )

        assert result.path == source_pdf
        assert result.bbox_text_stripped_page_indices == frozenset()
        assert len(result.bbox_text_strip_skipped_page_indices) == 121
