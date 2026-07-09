from __future__ import annotations

import json
from pathlib import Path


def save_json(path: Path, payload: dict, *, compact: bool = False) -> None:
    # compact=True skips pretty-printing; use it for large machine-consumed
    # documents (document.v1.json, provider payloads) where indent=2 inflates
    # the file by 30-50% and slows every downstream parse.
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    else:
        serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    path.write_text(serialized, encoding="utf-8")
