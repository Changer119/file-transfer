import { stat } from 'node:fs/promises'
import type { DeviceInfo } from '@shared/deviceTypes'
import type { FileEntry, ProgressCallback } from '@shared/fileEntry'
import { findAuthorizedSerial, isSerialAuthorized, type DeviceClient } from './deviceClient'
import { runAdb, runAdbBinary } from './adbCommand'

const PROGRESS_POLL_INTERVAL_MS = 250

/** Real DeviceClient backed by the `adb` command-line tool. */
export class AdbDeviceClient implements DeviceClient {
  async listDevices(): Promise<DeviceInfo[]> {
    const output = await runAdb(['devices'])
    return output
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [serial, state] = line.split(/\s+/)
        return serial ? { serial, authorized: state === 'device' } : undefined
      })
      .filter((device): device is DeviceInfo => device !== undefined)
  }

  async getSerialNumber(): Promise<string | undefined> {
    return findAuthorizedSerial(await this.listDevices())
  }

  async isConnected(serial: string): Promise<boolean> {
    return isSerialAuthorized(await this.listDevices(), serial)
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    const output = await runAdb(['shell', `ls -la "${path}"`])
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('total'))
      .map((line) => parseLsLine(line, path))
      .filter((entry): entry is FileEntry => entry !== undefined)
  }

  async pushFile(sourcePath: string, destPath: string, onProgress: ProgressCallback): Promise<void> {
    const totalBytes = await this.getFileSize(sourcePath)
    const pollTimer = setInterval(() => {
      stat(destPath)
        .then((stats) => onProgress({ bytesTransferred: stats.size, totalBytes }))
        .catch(() => undefined)
    }, PROGRESS_POLL_INTERVAL_MS)

    try {
      await runAdb(['pull', sourcePath, destPath])
    } finally {
      clearInterval(pollTimer)
    }
    onProgress({ bytesTransferred: totalBytes, totalBytes })
  }

  async deleteFile(path: string): Promise<void> {
    await runAdb(['shell', `rm "${path}"`])
  }

  async readFileBytes(path: string): Promise<Buffer> {
    return runAdbBinary(['exec-out', `cat "${path}"`])
  }

  private async getFileSize(path: string): Promise<number> {
    const output = await runAdb(['shell', `stat -c%s "${path}"`])
    return Number.parseInt(output.trim(), 10)
  }
}

function parseLsLine(line: string, dirPath: string): FileEntry | undefined {
  const parts = line.split(/\s+/)
  if (parts.length < 8) return undefined
  const name = parts.slice(7).join(' ')
  if (name === '.' || name === '..') return undefined
  return {
    name,
    path: `${dirPath.replace(/\/$/, '')}/${name}`,
    isDirectory: line.startsWith('d'),
    sizeBytes: Number.parseInt(parts[4] ?? '0', 10) || 0
  }
}
