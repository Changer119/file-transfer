import type { DeviceInfo } from '@shared/deviceTypes'
import type { FileEntry, ProgressCallback } from '@shared/fileEntry'
import { AdbNotFoundError, findAuthorizedSerial, isSerialAuthorized, type DeviceClient } from './deviceClient'

export interface RecordedPush {
  sourcePath: string
  destPath: string
}

interface PendingPush {
  resolve: () => void
  reject: (error: Error) => void
}

/**
 * In-memory test double for DeviceClient. Test code drives scenarios via
 * setDevices()/simulateAdbNotFound()/holdPush()/simulatePushFailure()
 * instead of a real adb subprocess.
 */
export class FakeDeviceClient implements DeviceClient {
  private devices: DeviceInfo[] = []
  private adbMissing = false
  private directories = new Map<string, FileEntry[]>()
  private unreadableDirectories = new Set<string>()
  private pushCalls: RecordedPush[] = []
  private pendingPushes = new Map<string, PendingPush>()
  private failingPushes = new Set<string>()
  private deleteCalls: string[] = []
  private fileContents = new Map<string, Buffer>()
  private failingReads = new Set<string>()
  private readCalls: string[] = []
  private pendingReads = new Map<string, () => void>()

  setDevices(devices: DeviceInfo[]): void {
    this.devices = devices
    this.adbMissing = false
  }

  simulateAdbNotFound(): void {
    this.adbMissing = true
  }

  setDirectory(path: string, entries: FileEntry[]): void {
    this.directories.set(path, entries)
  }

  simulateDirectoryNotFound(path: string): void {
    this.unreadableDirectories.add(path)
  }

  async listDevices(): Promise<DeviceInfo[]> {
    if (this.adbMissing) throw new AdbNotFoundError()
    return this.devices
  }

  async getSerialNumber(): Promise<string | undefined> {
    return findAuthorizedSerial(await this.listDevices())
  }

  async isConnected(serial: string): Promise<boolean> {
    return isSerialAuthorized(await this.listDevices(), serial)
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    if (this.unreadableDirectories.has(path)) throw new Error(`directory not found: ${path}`)
    return this.directories.get(path) ?? []
  }

  pushCallLog(): RecordedPush[] {
    return [...this.pushCalls]
  }

  /** The next pushFile() for this source path won't resolve until releasePush() is called. */
  holdPush(sourcePath: string): void {
    this.pendingPushes.set(sourcePath, { resolve: () => undefined, reject: () => undefined })
  }

  releasePush(sourcePath: string): void {
    this.pendingPushes.get(sourcePath)?.resolve()
  }

  simulatePushFailure(sourcePath: string): void {
    this.failingPushes.add(sourcePath)
  }

  deleteCallLog(): string[] {
    return [...this.deleteCalls]
  }

  /**
   * Simulates a USB disconnect for the given serial: the device drops out of
   * listDevices()/isConnected(), and any pushFile() currently held (via
   * holdPush) for it rejects instead of resolving — mirroring how a real
   * adb push errors out once the device disappears mid-transfer.
   */
  simulateDisconnect(serial: string): void {
    this.devices = this.devices.filter((device) => device.serial !== serial)
    for (const pending of this.pendingPushes.values()) {
      pending.reject(new Error(`simulated device disconnect: ${serial}`))
    }
    this.pendingPushes.clear()
  }

  async pushFile(sourcePath: string, destPath: string, onProgress: ProgressCallback): Promise<void> {
    this.pushCalls.push({ sourcePath, destPath })
    onProgress({ bytesTransferred: 0, totalBytes: 1 })
    if (this.pendingPushes.has(sourcePath)) {
      await new Promise<void>((resolve, reject) => {
        this.pendingPushes.set(sourcePath, { resolve, reject })
      })
      this.pendingPushes.delete(sourcePath)
    }
    if (this.failingPushes.has(sourcePath)) throw new Error(`simulated push failure: ${sourcePath}`)
    onProgress({ bytesTransferred: 1, totalBytes: 1 })
  }

  async deleteFile(path: string): Promise<void> {
    this.deleteCalls.push(path)
    for (const [dirPath, entries] of this.directories) {
      this.directories.set(dirPath, entries.filter((entry) => entry.path !== path))
    }
  }

  /** 缩略图测试用：预先注册某个路径读出来应该是什么字节。 */
  setFileContent(path: string, content: Buffer): void {
    this.fileContents.set(path, content)
  }

  simulateReadFailure(path: string): void {
    this.failingReads.add(path)
  }

  readFileBytesCallLog(): string[] {
    return [...this.readCalls]
  }

  /** The next readFileBytes() for this path won't resolve until releaseRead() is called. */
  holdRead(path: string): void {
    this.pendingReads.set(path, () => undefined)
  }

  releaseRead(path: string): void {
    this.pendingReads.get(path)?.()
  }

  async readFileBytes(path: string): Promise<Buffer> {
    this.readCalls.push(path)
    if (this.pendingReads.has(path)) {
      await new Promise<void>((resolve) => this.pendingReads.set(path, resolve))
      this.pendingReads.delete(path)
    }
    if (this.failingReads.has(path)) throw new Error(`simulated read failure: ${path}`)
    const content = this.fileContents.get(path)
    if (content === undefined) throw new Error(`no fake content registered for: ${path}`)
    return content
  }
}
