#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${RETAIN_PDF_STATUS_CARD_LAYOUT_PORT:-41778}"
URL="http://127.0.0.1:${PORT}/problem/status-card-layout-scale/index.html"
OUT_DIR="${ROOT_DIR}/problem/status-card-layout-scale"
SERVER_LOG="${OUT_DIR}/server.log"
DOM_FILE="${OUT_DIR}/status-card-layout.dom.html"
PNG_FILE="${OUT_DIR}/status-card-layout.png"
JSON_FILE="${OUT_DIR}/status-card-layout.json"

cd "${ROOT_DIR}"

python3 scripts/serve_static.py --host 127.0.0.1 --port "${PORT}" --root . >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

chromium-browser \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --virtual-time-budget=3000 \
  --window-size=1400,940 \
  --screenshot="${PNG_FILE}" \
  "${URL}" >/dev/null

chromium-browser \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --virtual-time-budget=3000 \
  --dump-dom \
  "${URL}" >"${DOM_FILE}"

python3 - <<'PY'
from __future__ import annotations

import html
import json
import re
from pathlib import Path

out_dir = Path("problem/status-card-layout-scale")
dom = (out_dir / "status-card-layout.dom.html").read_text(encoding="utf-8")
match = re.search(r'<pre id="layout-metrics"[^>]*>(.*?)</pre>', dom, re.S)
if not match:
    raise SystemExit("missing #layout-metrics in DOM")
payload = html.unescape(match.group(1))
data = json.loads(payload)
(out_dir / "status-card-layout.json").write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print("status-card-layout-scale smoke passed")
PY

echo "screenshot: ${PNG_FILE}"
echo "json: ${JSON_FILE}"
