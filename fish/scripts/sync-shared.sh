#!/usr/bin/env bash
# scripts/sync-shared.sh
# 把 shared/ 里的源文件同步到 web/src/ 与 mobile/src/
# 在修改 shared/ 后跑一次，或重定向到 pre-commit hook

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHARED="$ROOT/shared"

for target in "$ROOT/web/src" "$ROOT/mobile/src"; do
  for f in "$SHARED"/*.js; do
    name="$(basename "$f")"
    # 只同步 main.js 与 ui.js 之外的文件（这两个是端点专属）
    [ "$name" = "main.js" ] && continue
    [ "$name" = "ui.js" ] && continue
    cp "$f" "$target/$name"
    echo "synced $target/$name"
  done
done

# vendor：three.js / OrbitControls 等本地依赖（避免 CDN 不可用）
for target in "$ROOT/web" "$ROOT/mobile"; do
  mkdir -p "$target/vendor"
  for vendor in "$SHARED/vendor"/*.js; do
    [ -f "$vendor" ] || continue
    name="$(basename "$vendor")"
    cp "$vendor" "$target/vendor/$name"
    echo "vendored $target/vendor/$name"
  done
done

echo "✓ shared/ → web/src + mobile/src/ + vendor/"