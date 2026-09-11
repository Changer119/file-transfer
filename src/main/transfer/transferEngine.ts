import { basename, join } from 'node:path'
import type { TransferSnapshot } from '@shared/transferTypes'
import type { DeviceClient } from '../device/deviceClient'
import { logger } from '../logger'

type SnapshotListener = (snapshot: TransferSnapshot) => void

interface FileState {
  path: string
  status: 'pending' | 'transferring' | 'done' | 'failed'
  bytesTransferred: number
  totalBytes: number
}

/**
 * Runs one Transfer Task: pushes the given files to destinationDir one at a
 * time, never concurrently, per issue #1's sequential-transfer decision.
 * Writing straight to `destinationDir/<filename>` is the Overwrite Policy:
 * a same-named file is replaced, never renamed or skipped.
 *
 * Resume (issue #7): a Transfer Task belongs to the Device it was started
 * with (`ownerSerial`, captured from the client at run() time). If pushFile
 * fails because that device has disconnected, the task pauses in the
 * `interrupted` state instead of marking the file failed and moving on.
 * Reconnecting the same serial (via onDeviceReconnected, wired from
 * DeviceMonitor) resumes automatically: already-`done` files are skipped,
 * the file that was mid-transfer is retried whole from scratch — per ADR
 * 0002, there is no byte-offset resume. Resume state lives only in this
 * instance's memory: a fresh TransferEngine (simulating an app restart)
 * never resumes a previous instance's interrupted task.
 */
export class TransferEngine {
  private files: FileState[] = []
  private currentIndex = -1
  private status: 'running' | 'completed' | 'interrupted' = 'completed'
  private destinationDir = ''
  private ownerSerial: string | undefined
  private readonly listeners: SnapshotListener[] = []

  constructor(private readonly client: DeviceClient) {}

  onSnapshotChange(listener: SnapshotListener): void {
    this.listeners.push(listener)
  }

  snapshot(): TransferSnapshot {
    const current = this.files[this.currentIndex]
    return {
      status: this.status,
      totalFiles: this.files.length,
      completedFiles: this.files.filter((file) => file.status === 'done').length,
      currentFile:
        current && current.status === 'transferring'
          ? { path: current.path, bytesTransferred: current.bytesTransferred, totalBytes: current.totalBytes }
          : undefined
    }
  }

  async run(sourcePaths: string[], destinationDir: string): Promise<void> {
    if (this.status === 'running' || this.status === 'interrupted') {
      throw new Error('TransferEngine.run() called while a transfer is already in progress')
    }

    // status 必须在第一个 await 之前同步置为 running，否则两次几乎同时
    // 发起的 run() 调用会都跑过上面的守卫检查（经典的 check-then-act 竞态）。
    this.status = 'running'
    this.files = sourcePaths.map((path) => ({ path, status: 'pending', bytesTransferred: 0, totalBytes: 0 }))
    this.currentIndex = -1
    this.destinationDir = destinationDir
    this.notify()

    // 任务归属于创建它时连接的 Device（CONTEXT.md「传输任务」词条）：记录下
    // serial，后续断线/续传判定都靠它，而不是靠猜测当前还连着哪台设备。
    try {
      this.ownerSerial = await this.client.getSerialNumber()
    } catch (error) {
      // 拿 serial 失败（比如 adb 掉了）不能让引擎卡死在 running：否则
      // "一键传输"按钮会永久禁用，且再也无法发起新的传输。
      this.status = 'completed'
      this.notify()
      throw error
    }

    await this.processQueue()
  }

  /**
   * Wired from DeviceMonitor.onStatusChange: called whenever a device
   * reconnects. Only resumes when it's the same serial that owns the
   * currently interrupted task — a different device reconnecting, or no
   * interrupted task, is a no-op (cross-device handling is issue #8).
   */
  onDeviceReconnected(serial: string): void {
    if (this.status !== 'interrupted' || this.ownerSerial !== serial) return
    this.status = 'running'
    this.notify()
    // 这里是事件回调触发的 fire-and-forget 续传，没有调用方在 await 它。
    // processQueue() 内部已经把 pushFile 失败和 isConnected() 查询失败都
    // 兜底成"回到 interrupted"，理论上不会再抛到这里；这层 catch 只是最后
    // 一道防线——万一真的抛出意外异常，也要把 status 拉回 interrupted，
    // 而不是让它永远卡在 running（导致再也无法重新发起或续传）。
    this.processQueue().catch((error: unknown) => {
      logger.warn({ error }, 'resuming an interrupted transfer task failed unexpectedly')
      this.status = 'interrupted'
      this.notify()
    })
  }

  private async processQueue(): Promise<void> {
    for (const [index, file] of this.files.entries()) {
      // done：已经成功续传跳过；failed：非断线导致的普通失败，重连也不重试。
      if (file.status === 'done' || file.status === 'failed') continue

      this.currentIndex = index
      file.status = 'transferring'
      file.bytesTransferred = 0
      file.totalBytes = 0
      this.notify()

      const destPath = join(this.destinationDir, basename(file.path))
      try {
        await this.client.pushFile(file.path, destPath, (progress) => {
          file.bytesTransferred = progress.bytesTransferred
          file.totalBytes = progress.totalBytes
          this.notify()
        })
        file.status = 'done'
      } catch (error) {
        // isOwnerDisconnected() 本身查询 isConnected() 也可能意外抛错（比如
        // adb 进程正在重启）；这种不确定情况按"断线"处理更安全——顶多多等一次
        // 重连，不会把还没传完的文件误判为永久失败、丢掉重传机会。
        if (await this.isOwnerDisconnected().catch(() => true)) {
          // ADR 0002：续传不做字节级续传，被打断的文件回到 pending，
          // 下次会整个从头重新调用 pushFile。
          file.status = 'pending'
          file.bytesTransferred = 0
          file.totalBytes = 0
          this.status = 'interrupted'
          this.notify()
          return
        }
        file.status = 'failed'
        logger.warn({ path: file.path, error }, 'pushFile failed, skipping to the next file')
      }
      this.notify()
    }

    this.status = 'completed'
    this.notify()
  }

  /**
   * 续传等待期间插入不同设备的处理（issue #8）：只在任务处于 interrupted
   * 状态时报告归属设备序列号，供上层（IPC 层）判断新接入的设备是否与它冲突。
   */
  interruptedOwnerSerial(): string | undefined {
    return this.status === 'interrupted' ? this.ownerSerial : undefined
  }

  /**
   * 用户在"检测到属于另一台设备的未完成任务"弹窗中确认放弃后调用：清空当前
   * 等待续传的任务并解绑归属序列号，新设备可以立即开始浏览/选择/传输。
   * 没有 interrupted 任务时是安全的空操作。
   *
   * 故意不调用 notify()：这里把 status 重置为 completed 只是"没有活跃任务"
   * 这个内部状态的复用，不代表一次真实的传输完成，不应该被当作
   * transferSnapshotChanged 事件广播出去——否则渲染进程可能把它误显示成
   * "传输完成"。放弃后的界面应该保持"尚未开始任何传输"的样子，等用户为
   * 新设备发起一次真正的 run() 时再自然产生第一次通知。
   */
  discardInterruptedTask(): void {
    if (this.status !== 'interrupted') return
    this.status = 'completed'
    this.files = []
    this.currentIndex = -1
    this.ownerSerial = undefined
  }

  private async isOwnerDisconnected(): Promise<boolean> {
    if (this.ownerSerial === undefined) return false
    return !(await this.client.isConnected(this.ownerSerial))
  }

  private notify(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}
