import type { DeviceInfo } from '@shared/deviceTypes'
import type { FileEntry, ProgressCallback } from '@shared/fileEntry'
import { AdbNotFoundError, findAuthorizedSerial, isSerialAuthorized, type DeviceClient } from './deviceClient'

/**
 * In-memory test double for DeviceClient. Test code drives scenarios via
 * setDevices()/simulateAdbNotFound() instead of a real adb subprocess.
 */
export class FakeDeviceClient implements DeviceClient {
  private devices: DeviceInfo[] = []
  private adbMissing = false
  private directories = new Map<string, FileEntry[]>()

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
    return this.directories.get(path) ?? []
  }

  async pushFile(_sourcePath: string, _destPath: string, onProgress: ProgressCallback): Promise<void> {
    onProgress({ bytesTransferred: 1, totalBytes: 1 })
  }

  async deleteFile(path: string): Promise<void> {
    for (const [dirPath, entries] of this.directories) {
      this.directories.set(dirPath, entries.filter((entry) => entry.path !== path))
    }
  }
}
