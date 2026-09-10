import { describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { TransferEngine } from '@main/transfer/transferEngine'
import { SelectionState } from '@main/transfer/selectionState'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showOpenDialog: vi.fn() }
}))

import { registerTransferIpc } from '@main/ipc/transferIpc'

function createFakeWindow(destroyed: boolean, send: (...args: unknown[]) => void): BrowserWindow {
  return { isDestroyed: () => destroyed, webContents: { send } } as unknown as BrowserWindow
}

describe('registerTransferIpc', () => {
  it('把传输进度快照推送给当前窗口', async () => {
    const client = new FakeDeviceClient()
    const engine = new TransferEngine(client)
    const selection = new SelectionState()
    const send = vi.fn()
    registerTransferIpc(() => createFakeWindow(false, send), engine, selection)

    await engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')

    expect(send).toHaveBeenCalledWith(
      IPC_CHANNELS.transferSnapshotChanged,
      expect.objectContaining({ status: 'running' })
    )
  })

  it('窗口已被关闭销毁时不再发送（Dock 重新激活前的空档），也不会抛错', async () => {
    const client = new FakeDeviceClient()
    const engine = new TransferEngine(client)
    const selection = new SelectionState()
    const send = vi.fn()
    registerTransferIpc(() => createFakeWindow(true, send), engine, selection)

    await expect(engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')).resolves.not.toThrow()

    expect(send).not.toHaveBeenCalled()
  })
})
