# File Transfer

一个个人工具：通过 USB 数据线把安卓手机上的照片和文件传到 Mac，支持断点续传。基于 Electron + React + TypeScript。

项目背景和领域词汇（设备、传输任务、续传、可浏览目录等概念的准确定义）见 [`CONTEXT.md`](./CONTEXT.md)。

## 环境要求

- Node.js + [pnpm](https://pnpm.io/)
- [`adb`](https://developer.android.com/tools/adb)（Android Debug Bridge），需要能在终端里直接执行 `adb` 命令
  ```bash
  brew install android-platform-tools
  ```
- `ffmpeg`（用于生成视频缩略图）
  ```bash
  brew install ffmpeg
  ```
- 手机侧：开启开发者模式和"USB 调试"，用数据线连接 Mac 后在手机上授权这台电脑

## 常用命令

所有 Run & Debug 操作统一通过 `scripts/` 目录下的脚本执行，不要直接用 `pnpm`/`npm`。

| 脚本 | 作用 |
| --- | --- |
| `./scripts/dev.sh` | 启动开发模式（带热重载的 Electron 窗口） |
| `./scripts/test.sh` | 运行 Vitest 测试套件 |
| `./scripts/typecheck.sh` | TypeScript 类型检查 |
| `./scripts/build.sh` | 类型检查 + 构建生产环境 JS 产物到 `out/` |
| `./scripts/package-mac.sh` | 打包成 macOS 应用并安装到 `/Applications`（见下） |

日志统一输出到 `logs/` 目录（pino）。

## 打包成 Mac App

```bash
./scripts/package-mac.sh
```

这个脚本会依次：先跑 `build.sh` 生成生产构建产物，再用 [electron-builder](https://www.electron.build/) 打包出 `.app`（配置见 `electron-builder.yml`，应用图标是 `build/icon.icns`），最后把打包结果安装到 `/Applications/fc文件传输.app`，可以直接从 Launchpad 或 Spotlight 打开。

这个 `.app` 没有做 Apple 开发者签名，仅用于在本机安装运行；如果分发给别人或从网上下载，macOS Gatekeeper 会拦截提示"身份不明的开发者"。

## 项目文档

- [`CONTEXT.md`](./CONTEXT.md)：领域词汇表，项目里的核心概念定义
- [`docs/agents/domain.md`](./docs/agents/domain.md)：领域文档维护方式
- [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md)：Issue 走 GitHub Issues（`Changer119/file-transfer`），通过 `gh` CLI 操作
- [`docs/adr/`](./docs/adr)：架构决策记录
