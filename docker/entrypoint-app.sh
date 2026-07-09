#!/usr/bin/env sh
set -eu

PROJECT_ROOT="${PROJECT_ROOT:-/app}"
RUST_API_ROOT="${RUST_API_ROOT:-/app/backend/rust_api}"
RUST_API_DATA_ROOT="${RUST_API_DATA_ROOT:-${RUST_API_DATA_DIR:-/data}}"
OUTPUT_ROOT="${OUTPUT_ROOT:-${RUST_API_OUTPUT_ROOT:-$RUST_API_DATA_ROOT/jobs}}"
TYPST_PACKAGE_CACHE_PATH="${TYPST_PACKAGE_CACHE_PATH:-$RUST_API_DATA_ROOT/typst-package-cache}"

export RUST_API_PROJECT_ROOT="${RUST_API_PROJECT_ROOT:-$PROJECT_ROOT}"
export RUST_API_ROOT="${RUST_API_ROOT:-$RUST_API_ROOT}"
export RUST_API_SCRIPTS_DIR="${RUST_API_SCRIPTS_DIR:-$PROJECT_ROOT/backend/scripts}"
export RUST_API_DATA_ROOT
export OUTPUT_ROOT
export RUST_API_OUTPUT_ROOT="$OUTPUT_ROOT"
export TYPST_PACKAGE_CACHE_PATH
if [ -d "${TYPST_PACKAGE_PATH:-}" ]; then
  export TYPST_PACKAGE_PATH
fi

mkdir -p \
  "$RUST_API_DATA_ROOT" \
  "$RUST_API_DATA_ROOT/uploads" \
  "$RUST_API_DATA_ROOT/downloads" \
  "$RUST_API_DATA_ROOT/db" \
  "$RUST_API_OUTPUT_ROOT" \
  "$TYPST_PACKAGE_CACHE_PATH"

for pkg in cmarker/0.1.8 mitex/0.2.6; do
  target="$TYPST_PACKAGE_CACHE_PATH/preview/$pkg"
  source="${TYPST_PACKAGE_PATH:-}/preview/$pkg"
  if [ ! -d "$target" ] && [ -d "$source" ]; then
    mkdir -p "$(dirname "$target")"
    cp -R "$source" "$target"
  fi
  if [ ! -d "$target" ]; then
    echo "ERROR: Typst package cache is missing preview/$pkg at $target." >&2
    echo "Set TYPST_PACKAGE_CACHE_PATH to a persistent cache containing preview/$pkg, or rebuild the image with bundled Typst packages." >&2
    exit 1
  fi
done

exec /usr/local/bin/rust_api
