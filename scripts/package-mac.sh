#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/build.sh
pnpm exec electron-builder --mac

APP_SRC=$(find dist -maxdepth 2 -name "*.app" | head -n 1)

if [ -z "$APP_SRC" ]; then
  echo "打包失败：dist/ 下未找到生成的 .app" >&2
  exit 1
fi

APP_NAME="$(basename "$APP_SRC")"

# 应用改名后，把旧名字的安装也清理掉，避免 /Applications 下同时留着新旧两个图标。
find /Applications -maxdepth 1 -name "*文件传输*.app" ! -name "$APP_NAME" -exec rm -rf {} +

rm -rf "/Applications/$APP_NAME"
cp -R "$APP_SRC" "/Applications/$APP_NAME"

echo "已安装到 /Applications/$APP_NAME"
