import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { DeviceMonitor } from '@main/device/deviceMonitor'
import { TransferEngine } from '@main/transfer/transferEngine'

const handlers = new Map<string, (...args: unknown[]) => unknown>()

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, listener: (...args: unknown[]) => unknown) => {
      handlers.set(channel, listener)
    })
  }
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
    handlers.clear()
  })

  it('把设备状态变化推送给当前窗口', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const engine = new TransferEngine(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(false, send), monitor, engine)

    client.setDevices([{ serial: 'ABC123', authorized: true }])
    await monitor.refresh()

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.deviceStatusChanged, { kind: 'connected', serial: 'ABC123' })
  })

  it('窗口已被关闭销毁时不再发送（Dock 重新激活前的空档），也不会抛错', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const engine = new TransferEngine(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(true, send), monitor, engine)

    client.setDevices([{ serial: 'ABC123', authorized: true }])
    await expect(monitor.refresh()).resolves.not.toThrow()

    expect(send).not.toHaveBeenCalled()
  })

  it('任务等待续传时，接入不同序列号的新设备会推送 foreign-device-pending 而不是 connected（issue #8）', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const engine = new TransferEngine(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(false, send), monitor, engine)

    // 先让 engine 产生一个 interrupted 任务，归属 SER1
    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const run = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')
    await vi.waitFor(() => expect(client.pushCallLog()).toHaveLength(1))
    client.simulateDisconnect('SER1')
    await run
    expect(engine.snapshot().status).toBe('interrupted')

    // 接入不同序列号的新设备
    client.setDevices([{ serial: 'OTHER', authorized: true }])
    await monitor.refresh()

    expect(send).toHaveBeenLastCalledWith(IPC_CHANNELS.deviceStatusChanged, {
      kind: 'foreign-device-pending',
      serial: 'OTHER'
    })
  })

  it('同一归属序列号重新连接时，正常推送 connected，不会被当成 foreign device（issue #7 续传路径不受影响）', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const engine = new TransferEngine(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(false, send), monitor, engine)

    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const run = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')
    await vi.waitFor(() => expect(client.pushCallLog()).toHaveLength(1))
    client.simulateDisconnect('SER1')
    await run

    client.setDevices([{ serial: 'SER1', authorized: true }])
    await monitor.refresh()

    expect(send).toHaveBeenLastCalledWith(IPC_CHANNELS.deviceStatusChanged, { kind: 'connected', serial: 'SER1' })
  })

  it('getDeviceStatus 在有冲突任务时也返回解析后的 foreign-device-pending（不只是变化推送）', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const engine = new TransferEngine(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(false, send), monitor, engine)

    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const run = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')
    await vi.waitFor(() => expect(client.pushCallLog()).toHaveLength(1))
    client.simulateDisconnect('SER1')
    await run

    client.setDevices([{ serial: 'OTHER', authorized: true }])
    const status = await handlers.get(IPC_CHANNELS.getDeviceStatus)?.()

    expect(status).toEqual({ kind: 'foreign-device-pending', serial: 'OTHER' })
  })

  it('确认放弃旧任务后，重新推送该新设备已解析为 connected 的状态，无需等待下一次状态变化', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const engine = new TransferEngine(client)
    const send = vi.fn()
    dispose = registerDeviceIpc(() => createFakeWindow(false, send), monitor, engine)

    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const run = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')
    await vi.waitFor(() => expect(client.pushCallLog()).toHaveLength(1))
    client.simulateDisconnect('SER1')
    await run

    client.setDevices([{ serial: 'OTHER', authorized: true }])
    await monitor.refresh()
    send.mockClear()

    await handlers.get(IPC_CHANNELS.discardInterruptedTask)?.()

    expect(engine.snapshot()).toMatchObject({ status: 'completed', totalFiles: 0 })
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.deviceStatusChanged, { kind: 'connected', serial: 'OTHER' })
  })
})
