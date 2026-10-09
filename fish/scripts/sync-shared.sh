#!/usr/bin/env bash
# scripts/sync-shared.sh
# 把 shared/ 里的源文件同步到 web/src/ 与 mobile/src/
# 在修改 shared/ 后跑一次，或重定向到 pre-commit hook
#
# 注：shared/vendor/ 已在 v2.x 删除（2D 场景无外部依赖）。
#     mobile/sw.js PWA cache 也已移除 vendor 路径。

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

echo "✓ shared/ → web/src + mobile/src/"