import { app } from 'electron'

const HOMEBREW_BIN_DIRS = ['/opt/homebrew/bin', '/opt/homebrew/sbin', '/usr/local/bin', '/usr/local/sbin']

/**
 * 从 Launchpad/Finder 启动的 GUI App 不会继承用户 shell 的 PATH（.zshrc 里
 * export 的那些目录），只有系统给的最小 PATH——用 Homebrew 装的 adb、ffmpeg
 * 这类命令行工具会因此"找不到"（真机验证时报过"未检测到 adb"）。这里把
 * Homebrew 两个可能的安装前缀补进 PATH，兼容 Intel（/usr/local）和
 * Apple Silicon（/opt/homebrew）。
 */
export function ensureCommandPath(): void {
  if (!app.isPackaged) return
  const current = process.env.PATH ?? ''
  const existing = current.split(':')
  const missing = HOMEBREW_BIN_DIRS.filter((dir) => !existing.includes(dir))
  if (missing.length > 0) process.env.PATH = [...missing, current].join(':')
}
