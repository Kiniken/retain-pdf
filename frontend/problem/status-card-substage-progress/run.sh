#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${RETAIN_PDF_STATUS_CARD_SMOKE_PORT:-41777}"
URL="http://127.0.0.1:${PORT}/problem/status-card-substage-progress/index.html"
OUT_DIR="${ROOT_DIR}/problem/status-card-substage-progress"
SERVER_LOG="${OUT_DIR}/server.log"
DOM_FILE="${OUT_DIR}/status-card-smoke.dom.html"
PNG_FILE="${OUT_DIR}/status-card-smoke.png"
JSON_FILE="${OUT_DIR}/status-card-smoke.json"

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
  --window-size=1800,760 \
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

out_dir = Path("problem/status-card-substage-progress")
dom = (out_dir / "status-card-smoke.dom.html").read_text(encoding="utf-8")
match = re.search(r'<pre id="smoke-result"[^>]*>(.*?)</pre>', dom, re.S)
if not match:
    raise SystemExit("missing #smoke-result in DOM")
payload = html.unescape(match.group(1))
data = json.loads(payload)
(out_dir / "status-card-smoke.json").write_text(
    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

expected = {
    "ocr-card": ("ocr", "ocr_processing", "第 28/33 页"),
    "translate-card": ("translate", "page_policies", "第 3/10 页"),
    "render-card": ("render", "render_compile", "编译 1/4"),
}
for item in data:
    stage, substage, progress = expected[item["id"]]
    if item["activeStage"] != stage:
        raise SystemExit(f"{item['id']} activeStage expected {stage}, got {item['activeStage']}")
    if item["activeSubstage"] != substage:
        raise SystemExit(f"{item['id']} activeSubstage expected {substage}, got {item['activeSubstage']}")
    if item["progressText"] != progress:
        raise SystemExit(f"{item['id']} progressText expected {progress}, got {item['progressText']}")
print("status-card-substage-progress smoke passed")
PY

echo "screenshot: ${PNG_FILE}"
echo "json: ${JSON_FILE}"
