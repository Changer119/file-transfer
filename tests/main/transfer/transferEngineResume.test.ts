import { describe, expect, it, vi } from 'vitest'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { TransferEngine } from '@main/transfer/transferEngine'

/**
 * issue #7「断线自动续传」的验收标准，覆盖：断线暂停、同序列号重连后跳过
 * 已完成文件、被打断文件整体重传、不同序列号重连不触发续传、App 重启
 * （全新引擎实例）后旧任务作废。
 */
describe('TransferEngine 断线自动续传', () => {
  it('传输过程中设备断开时，任务状态变为 interrupted 并暂停，不会继续处理下一个文件', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const engine = new TransferEngine(client)

    const run = engine.run(['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg'], '/Users/test/Desktop')

    await vi.waitFor(() => {
      expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual(['/sdcard/DCIM/a.jpg'])
    })

    client.simulateDisconnect('SER1')
    await run

    expect(engine.snapshot()).toMatchObject({ status: 'interrupted', totalFiles: 2, completedFiles: 0 })
    expect(engine.snapshot().currentFile).toBeUndefined()
    expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual(['/sdcard/DCIM/a.jpg'])
  })

  it('同一序列号设备重新连接后自动继续：已完成文件不重传，被打断的文件整体从头重传', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/b.jpg')
    const engine = new TransferEngine(client)

    const run = engine.run(
      ['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg', '/sdcard/DCIM/c.jpg'],
      '/Users/test/Desktop'
    )

    // a.jpg 顺利完成，b.jpg 正在传输时断线
    await vi.waitFor(() => {
      expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual([
        '/sdcard/DCIM/a.jpg',
        '/sdcard/DCIM/b.jpg'
      ])
    })
    client.simulateDisconnect('SER1')
    await run
    expect(engine.snapshot().status).toBe('interrupted')

    // 同一序列号重新连接，App 自动继续，无需用户点击任何按钮
    client.setDevices([{ serial: 'SER1', authorized: true }])
    engine.onDeviceReconnected('SER1')

    await vi.waitFor(() => {
      expect(engine.snapshot().status).toBe('completed')
    })

    expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual([
      '/sdcard/DCIM/a.jpg', // 首次传输，已 done，续传时不会重新调用
      '/sdcard/DCIM/b.jpg', // 被打断时的首次尝试
      '/sdcard/DCIM/b.jpg', // 续传：整个文件从头重新调用一次 pushFile
      '/sdcard/DCIM/c.jpg'
    ])
    expect(engine.snapshot()).toMatchObject({ totalFiles: 3, completedFiles: 3 })
  })

  it('不同序列号的设备重新连接时，不会触发续传', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const engine = new TransferEngine(client)

    const run = engine.run(['/sdcard/DCIM/a.jpg'], '/Users/test/Desktop')
    await vi.waitFor(() => expect(client.pushCallLog()).toHaveLength(1))
    client.simulateDisconnect('SER1')
    await run
    expect(engine.snapshot().status).toBe('interrupted')

    client.setDevices([{ serial: 'OTHER', authorized: true }])
    engine.onDeviceReconnected('OTHER')
    await Promise.resolve()
    await Promise.resolve()

    expect(engine.snapshot().status).toBe('interrupted')
    expect(client.pushCallLog()).toHaveLength(1)
  })

  it('用全新的 TransferEngine 实例模拟 App 重启后，旧的 interrupted 任务不会被恢复', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'SER1', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')
    const oldEngine = new TransferEngine(client)

    const run = oldEngine.run(['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg'], '/Users/test/Desktop')
    await vi.waitFor(() => expect(client.pushCallLog()).toHaveLength(1))
    client.simulateDisconnect('SER1')
    await run
    expect(oldEngine.snapshot().status).toBe('interrupted')

    // "重启"：新的 TransferEngine 实例不知道旧实例的任何内存状态
    client.setDevices([{ serial: 'SER1', authorized: true }])
    const newEngine = new TransferEngine(client)
    newEngine.onDeviceReconnected('SER1')
    await Promise.resolve()
    await Promise.resolve()

    expect(newEngine.snapshot()).toMatchObject({ status: 'completed', totalFiles: 0, completedFiles: 0 })
    expect(client.pushCallLog().map((call) => call.sourcePath)).toEqual(['/sdcard/DCIM/a.jpg'])
  })
})
