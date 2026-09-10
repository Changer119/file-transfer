import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { DeviceMonitor } from '@main/device/deviceMonitor'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() }
}))

import { registerDeviceIpc } from '@main/ipc/deviceIpc'

function createFakeWindow(destroyed: boolean, send: (...args: unknown[]) => void): BrowserWindow {
  return { isDestroyed: () => destroyed, webContents: { send } } as unknown as BrowserWindow
}

describe('registerDeviceIpc', () => {
  let dispose: (() => void) | undefined

  afterEach(() => {
    dispose?.()
    dispose = undefined
  })

  it('把设备状态变化推送给当前窗口', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(false, send), monitor)

    client.setDevices([{ serial: 'ABC123', authorized: true }])
    await monitor.refresh()

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.deviceStatusChanged, { kind: 'connected', serial: 'ABC123' })
  })

  it('窗口已被关闭销毁时不再发送（Dock 重新激活前的空档），也不会抛错', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(true, send), monitor)

    client.setDevices([{ serial: 'ABC123', authorized: true }])
    await expect(monitor.refresh()).resolves.not.toThrow()

    expect(send).not.toHaveBeenCalled()
  })
})
