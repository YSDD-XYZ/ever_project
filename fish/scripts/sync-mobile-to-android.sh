#!/usr/bin/env bash
# sync-mobile-to-android.sh —— 把 fish/mobile/ 资源同步到 Android assets
# 用法：bash scripts/sync-mobile-to-android.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FISH_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$FISH_DIR/mobile"
DST="$FISH_DIR/android/app/src/main/assets"

if [[ ! -d "$SRC" ]]; then
  echo "❌ 找不到 $SRC"
  exit 1
fi

echo "📦 同步 $SRC → $DST"
mkdir -p "$DST"

# 优先 rsync（更快）,没有则用 cp -ru
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    "$SRC/" "$DST/"
else
  # 删 dst 中 src 没有的文件
  (cd "$SRC" && find . -type f) | while read -r rel; do
    mkdir -p "$DST/$(dirname "$rel")"
    cp -f "$SRC/$rel" "$DST/$rel"
  done
  # 删 dst 里有但 src 里没有的（空目录会自动跳过）
  (cd "$DST" && find . -type f) | while read -r rel; do
    if [[ ! -f "$SRC/$rel" ]]; then
      rm -f "$DST/$rel"
    fi
  done
fi

echo "✅ 同步完成。assets 大小："
du -sh "$DST"
