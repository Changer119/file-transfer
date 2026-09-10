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
  private failingDeletes = new Set<string>()

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

  simulateDeleteFailure(path: string): void {
    this.failingDeletes.add(path)
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
    if (this.failingDeletes.has(path)) throw new Error(`simulated delete failure: ${path}`)
    for (const [dirPath, entries] of this.directories) {
      this.directories.set(dirPath, entries.filter((entry) => entry.path !== path))
    }
  }
}
