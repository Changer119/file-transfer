import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression test for issue #9: macOS Dock 重新激活（`app.on('activate')`）
 * 曾经会再次调用 `createWindow()`，进而重复执行 `ipcMain.handle(<channel>, ...)`。
 * Electron 对同一个 channel 重复注册 handler 会直接抛错，所以这里用假的
 * `ipcMain.handle` 复现同样的"重复注册即抛错"行为，断言窗口被多次重建后
 * 依然只注册一次。
 */

interface FakeWindow {
  webContents: { send: (...args: unknown[]) => void }
}

const state = vi.hoisted(() => ({
  windows: [] as FakeWindow[],
  appHandlers: new Map<string, () => void>(),
  registeredChannels: new Set<string>()
}))

vi.mock('electron', () => {
  class BrowserWindow {
    webContents = { send: () => undefined }
    loadURL = () => undefined
    loadFile = () => undefined

    constructor() {
      state.windows.push(this as unknown as FakeWindow)
    }

    static getAllWindows(): FakeWindow[] {
      return state.windows
    }
  }

  const app = {
    whenReady: () => Promise.resolve(),
    on: (event: string, callback: () => void) => {
      state.appHandlers.set(event, callback)
    },
    quit: () => undefined
  }

  const ipcMain = {
    handle: (channel: string) => {
      if (state.registeredChannels.has(channel)) {
        throw new Error(`Attempted to register a second handler for '${channel}'`)
      }
      state.registeredChannels.add(channel)
    }
  }

  const dialog = {
    showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] })
  }

  return { app, BrowserWindow, ipcMain, dialog }
})

describe('main/index', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    state.windows.length = 0
    state.appHandlers.clear()
    state.registeredChannels.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('只注册一次 ipcMain.handle，即使 Dock 重新激活多次重建窗口', async () => {
    await import('../../src/main/index')
    await Promise.resolve()
    await Promise.resolve()

    expect(state.windows).toHaveLength(1)
    const channelsAfterFirstWindow = state.registeredChannels.size
    expect(channelsAfterFirstWindow).toBeGreaterThan(0)

    const activate = state.appHandlers.get('activate')
    expect(activate).toBeDefined()

    // 模拟：关闭所有窗口后点击 Dock 图标重新激活，重复两次。
    state.windows.length = 0
    expect(() => activate?.()).not.toThrow()
    state.windows.length = 0
    expect(() => activate?.()).not.toThrow()

    expect(state.windows).toHaveLength(1)
    expect(state.registeredChannels.size).toBe(channelsAfterFirstWindow)
  })
})
