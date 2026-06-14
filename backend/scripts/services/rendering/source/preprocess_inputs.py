from __future__ import annotations

from pathlib import Path

from services.rendering.source_cleanup.protected_blocks import protected_pages_from_document_path


def build_preprocess_protected_pages(
    *,
    artifacts_dir: Path,
    translated_pages: dict[int, list[dict]],
) -> dict[int, list[dict]]:
    return build_preprocess_protected_pages_from_document_path(
        Path(artifacts_dir).parent / "ocr" / "normalized" / "document.v1.json",
        translated_pages=translated_pages,
    )


def build_preprocess_protected_pages_from_document_path(
    document_path: Path,
    *,
    translated_pages: dict[int, list[dict]] | None = None,
) -> dict[int, list[dict]]:
    return protected_pages_from_document_path(
        document_path,
        translated_pages=translated_pages,
    )


__all__ = [
    "build_preprocess_protected_pages",
    "build_preprocess_protected_pages_from_document_path",
]
