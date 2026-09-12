import { describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { SelectionState } from '@main/transfer/selectionState'

const handlers = new Map<string, (...args: unknown[]) => unknown>()

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, listener: (...args: unknown[]) => unknown) => {
      handlers.set(channel, listener)
    })
  }
}))

import { registerFileDeletionIpc } from '@main/ipc/fileDeletionIpc'

describe('registerFileDeletionIpc', () => {
  it('deletes every given path via the Device Client and reports them all as succeeded', async () => {
    const client = new FakeDeviceClient()
    const selection = new SelectionState()
    registerFileDeletionIpc(client, selection)

    const result = await handlers.get(IPC_CHANNELS.deleteFiles)?.(null, [
      '/sdcard/DCIM/Camera/a.jpg',
      '/sdcard/DCIM/Camera/b.jpg'
    ])

    expect(client.deleteCallLog()).toEqual(['/sdcard/DCIM/Camera/a.jpg', '/sdcard/DCIM/Camera/b.jpg'])
    expect(result).toEqual({
      succeeded: ['/sdcard/DCIM/Camera/a.jpg', '/sdcard/DCIM/Camera/b.jpg'],
      failed: [],
      selectedPaths: []
    })
  })

  it('reports a per-file failure without aborting the rest of the batch', async () => {
    const client = new FakeDeviceClient()
    client.simulateDeleteFailure('/sdcard/DCIM/Camera/broken.jpg')
    const selection = new SelectionState()
    registerFileDeletionIpc(client, selection)

    const result = await handlers.get(IPC_CHANNELS.deleteFiles)?.(null, [
      '/sdcard/DCIM/Camera/broken.jpg',
      '/sdcard/DCIM/Camera/ok.jpg'
    ])

    expect(result).toEqual({
      succeeded: ['/sdcard/DCIM/Camera/ok.jpg'],
      failed: ['/sdcard/DCIM/Camera/broken.jpg'],
      selectedPaths: []
    })
  })

  it('removes only the successfully deleted paths from the current selection', async () => {
    const client = new FakeDeviceClient()
    client.simulateDeleteFailure('/sdcard/DCIM/Camera/broken.jpg')
    const selection = new SelectionState()
    selection.selectAllInFolder([
      '/sdcard/DCIM/Camera/broken.jpg',
      '/sdcard/DCIM/Camera/ok.jpg',
      '/sdcard/DCIM/Camera/untouched.jpg'
    ])
    registerFileDeletionIpc(client, selection)

    const result = await handlers.get(IPC_CHANNELS.deleteFiles)?.(null, [
      '/sdcard/DCIM/Camera/broken.jpg',
      '/sdcard/DCIM/Camera/ok.jpg'
    ])

    expect((result as { selectedPaths: string[] }).selectedPaths.sort()).toEqual([
      '/sdcard/DCIM/Camera/broken.jpg',
      '/sdcard/DCIM/Camera/untouched.jpg'
    ])
    expect(selection.selectedPaths().sort()).toEqual([
      '/sdcard/DCIM/Camera/broken.jpg',
      '/sdcard/DCIM/Camera/untouched.jpg'
    ])
  })
})
