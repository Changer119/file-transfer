import { describe, expect, it, vi } from 'vitest'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { TransferEngine } from '@main/transfer/transferEngine'
import type { TransferSnapshot } from '@shared/transferTypes'

describe('TransferEngine', () => {
  it('transfers files one at a time, never starting the next before the current one finishes', async () => {
    const client = new FakeDeviceClient()
    client.holdPush('/sdcard/DCIM/a.jpg')
    client.holdPush('/sdcard/DCIM/b.jpg')
    const engine = new TransferEngine(client)

    const run = engine.run(['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg'], '/Users/test/Desktop')

    await vi.waitFor(() => {
      expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual(['/sdcard/DCIM/a.jpg'])
    })

    client.releasePush('/sdcard/DCIM/a.jpg')
    await vi.waitFor(() => {
      expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual([
        '/sdcard/DCIM/a.jpg',
        '/sdcard/DCIM/b.jpg'
      ])
    })

    client.releasePush('/sdcard/DCIM/b.jpg')
    await run
  })

  it('always writes to the same destination path for a given filename, so a same-named file is overwritten rather than renamed', async () => {
    const client = new FakeDeviceClient()
    const engine = new TransferEngine(client)

    await engine.run(['/sdcard/DCIM/photo.jpg'], '/Users/test/Desktop')
    await engine.run(['/sdcard/Download/photo.jpg'], '/Users/test/Desktop')

    expect(client.pushCallLog().map((call) => call.destPath)).toEqual([
      '/Users/test/Desktop/photo.jpg',
      '/Users/test/Desktop/photo.jpg'
    ])
  })

  it('reports overall and per-file progress while a transfer is in flight, then marks the task completed', async () => {
    const client = new FakeDeviceClient()
    client.holdPush('/sdcard/DCIM/a.jpg')
    const engine = new TransferEngine(client)

    const run = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')

    await vi.waitFor(() => {
      const snapshot = engine.snapshot()
      expect(snapshot.status).toBe('running')
      expect(snapshot.totalFiles).toBe(1)
      expect(snapshot.completedFiles).toBe(0)
      expect(snapshot.currentFile?.path).toBe('/sdcard/DCIM/a.jpg')
    })

    client.releasePush('/sdcard/DCIM/a.jpg')
    await run

    expect(engine.snapshot()).toMatchObject({ status: 'completed', totalFiles: 1, completedFiles: 1 })
  })

  it('marks a failed file as failed but keeps transferring the rest of the task', async () => {
    const client = new FakeDeviceClient()
    client.simulatePushFailure('/sdcard/DCIM/broken.jpg')
    const engine = new TransferEngine(client)

    await engine.run(['/sdcard/DCIM/broken.jpg', '/sdcard/DCIM/ok.jpg'], '/Users/test/Desktop')

    expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual([
      '/sdcard/DCIM/broken.jpg',
      '/sdcard/DCIM/ok.jpg'
    ])
    expect(engine.snapshot()).toMatchObject({ status: 'completed', totalFiles: 2, completedFiles: 1 })
  })

  it('rejects a second run() call while a transfer is still in progress, instead of corrupting the in-flight one', async () => {
    const client = new FakeDeviceClient()
    client.holdPush('/sdcard/DCIM/a.jpg')
    const engine = new TransferEngine(client)

    const firstRun = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')

    await expect(engine.run(['/sdcard/DCIM/b.jpg'], '/Users/test/Desktop')).rejects.toThrow()

    client.releasePush('/sdcard/DCIM/a.jpg')
    await firstRun
  })

  it('notifies onSnapshotChange listeners as the task progresses', async () => {
    const client = new FakeDeviceClient()
    const engine = new TransferEngine(client)
    const snapshots: TransferSnapshot[] = []
    engine.onSnapshotChange((snapshot) => snapshots.push(snapshot))

    await engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')

    expect(snapshots.some((snapshot) => snapshot.status === 'running')).toBe(true)
    expect(snapshots.at(-1)).toMatchObject({ status: 'completed', totalFiles: 1, completedFiles: 1 })
  })
})
