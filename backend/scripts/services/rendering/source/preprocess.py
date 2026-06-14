from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import time
from typing import Any

from foundation.config import layout
from services.rendering.contracts import RenderDocumentAnalysis
from services.rendering.source.prewarm_fingerprint import build_render_prewarm_fingerprint
from services.rendering.source.prewarm_manifest import write_json_atomic
from services.rendering.source.prewarm_manifest_io import build_prewarm_manifest
from services.rendering.source.prewarm_payload import build_payload_prewarm
from services.rendering.source.preprocess_inputs import build_preprocess_protected_pages
from services.rendering.source.render_source import RenderSourcePdf
from services.rendering.source.render_source import build_render_source_pdf


@dataclass(frozen=True)
class RenderPreprocessRequest:
    source_pdf_path: Path
    output_pdf_path: Path
    artifacts_dir: Path
    manifest_path: Path
    translated_pages: dict[int, list[dict]]
    effective_render_mode: str
    start_page: int
    end_page: int
    pdf_compress_dpi: int
    source_cleanup_strategy: str
    include_source_cleanup: bool = True
    document_analysis: RenderDocumentAnalysis | None = None
    prepared_source: RenderSourcePdf | None = None


@dataclass(frozen=True)
class RenderPreprocessResult:
    prepared_source: RenderSourcePdf
    payload_prewarm: dict[str, Any]
    manifest: dict[str, Any]
    elapsed_seconds: float


def run_render_preprocess(request: RenderPreprocessRequest) -> RenderPreprocessResult:
    started = time.perf_counter()
    request.manifest_path.parent.mkdir(parents=True, exist_ok=True)
    cleanup_strategy = (
        request.source_cleanup_strategy
        if request.include_source_cleanup
        else layout.SOURCE_CLEANUP_TYPST_FILL
    )
    protected_pages = build_preprocess_protected_pages(
        artifacts_dir=request.artifacts_dir,
        translated_pages=request.translated_pages,
    )
    prepared = request.prepared_source or build_render_source_pdf(
        source_pdf_path=request.source_pdf_path,
        output_pdf_path=request.manifest_path.parent / request.output_pdf_path.name,
        pdf_compress_dpi=request.pdf_compress_dpi,
        translated_pages=request.translated_pages,
        protected_pages=protected_pages,
        strip_hidden_text=request.effective_render_mode != "overlay",
        start_page=request.start_page,
        end_page=request.end_page,
        artifact_mode=True,
        source_cleanup_strategy=cleanup_strategy,
        document_analysis=request.document_analysis,
    )
    payload_prewarm = build_payload_prewarm(
        source_pdf_path=request.source_pdf_path,
        translated_pages=request.translated_pages,
        manifest_path=request.manifest_path,
        effective_render_mode=request.effective_render_mode,
        source_cleanup_strategy=cleanup_strategy,
        bbox_text_strip_candidates=(
            prepared.bbox_text_strip_candidates
            if request.include_source_cleanup
            else None
        ),
        protected_pages=protected_pages,
    )
    elapsed = time.perf_counter() - started
    manifest = build_prewarm_manifest(
        manifest_path=request.manifest_path,
        prepared=prepared,
        fingerprint=build_render_prewarm_fingerprint(
            source_pdf_path=request.source_pdf_path,
            translated_pages=request.translated_pages,
            effective_render_mode=request.effective_render_mode,
            start_page=request.start_page,
            end_page=request.end_page,
            pdf_compress_dpi=request.pdf_compress_dpi,
            source_cleanup_strategy=cleanup_strategy,
        ),
        elapsed=elapsed,
        payload_prewarm=payload_prewarm,
        document_analysis=prepared.document_analysis or request.document_analysis,
    )
    write_json_atomic(request.manifest_path, manifest)
    return RenderPreprocessResult(
        prepared_source=prepared,
        payload_prewarm=payload_prewarm,
        manifest=manifest,
        elapsed_seconds=elapsed,
    )


__all__ = [
    "RenderPreprocessRequest",
    "RenderPreprocessResult",
    "run_render_preprocess",
]
