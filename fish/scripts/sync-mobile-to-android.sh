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
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='*.log' \
  "$SRC/" "$DST/"

echo "✅ 同步完成。assets 大小："
du -sh "$DST"
