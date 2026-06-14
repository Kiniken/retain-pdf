#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${RETAIN_PDF_WA_STATUS_CARD_PORT:-41779}"
URL="http://127.0.0.1:${PORT}/problem/status-card-webawesome-prototype/index.html"
OUT_DIR="${ROOT_DIR}/problem/status-card-webawesome-prototype"
SERVER_LOG="${OUT_DIR}/server.log"
DOM_FILE="${OUT_DIR}/status-card-webawesome.dom.html"
PNG_FILE="${OUT_DIR}/status-card-webawesome.png"
JSON_FILE="${OUT_DIR}/status-card-webawesome.json"

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
  --window-size=1400,980 \
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

out_dir = Path("problem/status-card-webawesome-prototype")
dom = (out_dir / "status-card-webawesome.dom.html").read_text(encoding="utf-8")
match = re.search(r'<pre id="webawesome-prototype-metrics"[^>]*>(.*?)</pre>', dom, re.S)
if not match:
    raise SystemExit("missing #webawesome-prototype-metrics in DOM")

checks = json.loads(html.unescape(match.group(1)))
checks["no_lit_boolean_syntax"] = "?disabled" not in dom

if checks.get("cards") != 4:
    raise SystemExit(f"expected 4 cards, found {checks.get('cards')}")
if not all(checks.get("upgraded", {}).values()):
    raise SystemExit(f"custom elements did not upgrade: {checks.get('upgraded')}")
for label in ("正在进行 OCR", "正在翻译全书", "正在渲染 PDF", "任务已完成"):
    if label not in checks.get("labels", []):
        raise SystemExit(f"missing rendered label: {label}")
if not checks["no_lit_boolean_syntax"]:
    raise SystemExit("found Lit boolean syntax in rendered DOM")

(out_dir / "status-card-webawesome.json").write_text(
    json.dumps(checks, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print("status-card-webawesome-prototype smoke passed")
PY

echo "screenshot: ${PNG_FILE}"
echo "json: ${JSON_FILE}"
