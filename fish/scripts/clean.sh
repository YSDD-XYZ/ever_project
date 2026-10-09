#!/usr/bin/env bash
# scripts/clean.sh —— 清理构建缓存和临时产物
# 在切换环境、释放磁盘、或修奇怪 bug 后跑一次
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🧹 清理 $ROOT 下的构建/缓存产物"

# 1) Android 缓存
if [[ -d "$ROOT/android/.gradle" ]]; then
  rm -rf "$ROOT/android/.gradle"
  echo "  ✓ android/.gradle"
fi
if [[ -d "$ROOT/diary-app/.gradle" ]]; then
  rm -rf "$ROOT/diary-app/.gradle"
  echo "  ✓ diary-app/.gradle"
fi
if [[ -d "$ROOT/diary-app/app/build" ]]; then
  rm -rf "$ROOT/diary-app/app/build"
  echo "  ✓ diary-app/app/build"
fi
if [[ -d "$ROOT/diary-app/app/release" ]]; then
  rm -rf "$ROOT/diary-app/app/release"
  echo "  ✓ diary-app/app/release"
fi

# 2) 残留空目录
for d in \
  "$ROOT/mobile/vendor" "$ROOT/mobile/public" \
  "$ROOT/web/vendor" "$ROOT/web/public"; do
  if [[ -d "$d" && -z "$(ls -A "$d" 2>/dev/null)" ]]; then
    rmdir "$d" && echo "  ✓ 空目录 $d"
  fi
done

# 3) Gradle wrapper 残留
for f in $(find "$ROOT" -name "*.jar.incomplete" 2>/dev/null); do
  rm -f "$f" && echo "  ✓ $f"
done

# 4) diary-app 旧 APK 警告（不自动删，提示）
old_apks=$(find "$ROOT/diary-app" -name "diary-app-v0.[1-7]*" -o -name "shi-guang-v0.7*" 2>/dev/null || true)
if [[ -n "$old_apks" ]]; then
  echo "  ℹ️  旧版 APK 仍在（需手动确认后删）："
  echo "$old_apks" | sed 's/^/      /'
fi

echo ""
echo "✅ 清理完成"
echo ""
echo "💡 提示：CI 之前若报 vendor 404 错误，可再跑一次："
echo "   bash $ROOT/scripts/sync-shared.sh"
