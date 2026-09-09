import type { DeviceInfo } from '@shared/deviceTypes'
import type { FileEntry, ProgressCallback } from '@shared/fileEntry'

export class AdbNotFoundError extends Error {
  constructor() {
    super('adb executable not found on PATH')
    this.name = 'AdbNotFoundError'
  }
}

export interface DeviceClient {
  listDevices(): Promise<DeviceInfo[]>
  getSerialNumber(): Promise<string | undefined>
  isConnected(serial: string): Promise<boolean>
  listDirectory(path: string): Promise<FileEntry[]>
  pushFile(sourcePath: string, destPath: string, onProgress: ProgressCallback): Promise<void>
  deleteFile(path: string): Promise<void>
}

/** Shared by every DeviceClient implementation's getSerialNumber(). */
export function findAuthorizedSerial(devices: DeviceInfo[]): string | undefined {
  return devices.find((device) => device.authorized)?.serial
}

/** Shared by every DeviceClient implementation's isConnected(). */
export function isSerialAuthorized(devices: DeviceInfo[], serial: string): boolean {
  return devices.some((device) => device.serial === serial && device.authorized)
}
