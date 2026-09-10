import type { DeviceInfo } from '@shared/deviceTypes'
import type { FileEntry, ProgressCallback } from '@shared/fileEntry'
import { AdbNotFoundError, findAuthorizedSerial, isSerialAuthorized, type DeviceClient } from './deviceClient'

export interface RecordedPush {
  sourcePath: string
  destPath: string
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
  private pendingPushes = new Map<string, () => void>()
  private failingPushes = new Set<string>()

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
    this.pendingPushes.set(sourcePath, () => undefined)
  }

  releasePush(sourcePath: string): void {
    this.pendingPushes.get(sourcePath)?.()
  }

  simulatePushFailure(sourcePath: string): void {
    this.failingPushes.add(sourcePath)
  }

  async pushFile(sourcePath: string, destPath: string, onProgress: ProgressCallback): Promise<void> {
    this.pushCalls.push({ sourcePath, destPath })
    onProgress({ bytesTransferred: 0, totalBytes: 1 })
    if (this.pendingPushes.has(sourcePath)) {
      await new Promise<void>((resolve) => this.pendingPushes.set(sourcePath, resolve))
      this.pendingPushes.delete(sourcePath)
    }
    if (this.failingPushes.has(sourcePath)) throw new Error(`simulated push failure: ${sourcePath}`)
    onProgress({ bytesTransferred: 1, totalBytes: 1 })
  }

  async deleteFile(path: string): Promise<void> {
    for (const [dirPath, entries] of this.directories) {
      this.directories.set(dirPath, entries.filter((entry) => entry.path !== path))
    }
  }
}
