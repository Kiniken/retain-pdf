from __future__ import annotations

import sys
from pathlib import Path

REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))

from services.document_schema.normalize_pipeline import _refresh_report_for_final_document


def test_refresh_report_for_final_document_uses_final_validation_counts() -> None:
    document = {
        "schema": "normalized_document_v1",
        "schema_version": "1.1",
        "document_id": "report-doc",
        "page_count": 1,
        "source": {"provider": "paddle"},
        "derived": {},
        "markers": {},
        "pages": [
            {
                "page_index": 0,
                "page": 1,
                "width": 320.0,
                "height": 480.0,
                "unit": "pt",
                "blocks": [
                    {
                        "block_id": "p001-b001",
                        "page_index": 0,
                        "order": 0,
                        "reading_order": 0,
                        "geometry": {"bbox": [10.0, 10.0, 100.0, 30.0]},
                        "content": {"kind": "text", "text": "kept"},
                        "layout_role": "paragraph",
                        "semantic_role": "body",
                        "structure_role": "body",
                        "policy": {"translate": True, "translate_reason": "body"},
                        "provenance": {
                            "provider": "paddle",
                            "raw_label": "text",
                            "raw_sub_type": "body",
                            "raw_bbox": [10.0, 10.0, 100.0, 30.0],
                            "raw_path": "layoutParsingResults[0]",
                        },
                        "continuation_hint": {
                            "source": "",
                            "group_id": "",
                            "role": "single",
                            "scope": "",
                            "reading_order": 0,
                            "confidence": 0.0,
                        },
                        "metadata": {},
                        "source": {"provider": "paddle"},
                    },
                    {
                        "block_id": "p001-b002",
                        "page_index": 0,
                        "order": 1,
                        "reading_order": 1,
                        "geometry": {"bbox": [10.0, 40.0, 120.0, 60.0]},
                        "content": {"kind": "text", "text": "rebuilt"},
                        "layout_role": "paragraph",
                        "semantic_role": "body",
                        "structure_role": "body",
                        "policy": {"translate": True, "translate_reason": "body"},
                        "provenance": {
                            "provider": "paddle",
                            "raw_label": "text",
                            "raw_sub_type": "body",
                            "raw_bbox": [10.0, 40.0, 120.0, 60.0],
                            "raw_path": "layoutParsingResults[1]",
                        },
                        "continuation_hint": {
                            "source": "",
                            "group_id": "",
                            "role": "single",
                            "scope": "",
                            "reading_order": 1,
                            "confidence": 0.0,
                        },
                        "metadata": {},
                        "source": {"provider": "paddle"},
                    },
                ],
            }
        ],
    }
    stale_report = {
        "provider": "paddle",
        "validation": {"valid": True, "page_count": 1, "block_count": 1},
        "defaults": {"pages_seen": 1, "blocks_seen": 1},
    }

    refreshed = _refresh_report_for_final_document(stale_report, document)

    assert refreshed["validation"]["page_count"] == 1
    assert refreshed["validation"]["block_count"] == 2
    assert refreshed["defaults"]["pages_seen"] == 1
    assert refreshed["defaults"]["blocks_seen"] == 2
