import type { ConnectionStatus } from '@shared/deviceTypes'
import { AdbNotFoundError, findAuthorizedSerial, type DeviceClient } from './deviceClient'

type StatusChangeListener = (status: ConnectionStatus) => void

export class DeviceMonitor {
  private lastStatus: ConnectionStatus = { kind: 'disconnected' }
  private readonly listeners: StatusChangeListener[] = []

  constructor(private readonly client: DeviceClient) {}

  onStatusChange(listener: StatusChangeListener): void {
    this.listeners.push(listener)
  }

  async refresh(): Promise<ConnectionStatus> {
    const status = await this.deriveStatus()
    if (!statusEquals(status, this.lastStatus)) {
      this.lastStatus = status
      for (const listener of this.listeners) listener(status)
    }
    return status
  }

  private async deriveStatus(): Promise<ConnectionStatus> {
    let devices
    try {
      devices = await this.client.listDevices()
    } catch (error) {
      if (error instanceof AdbNotFoundError) return { kind: 'adb-not-found' }
      throw error
    }

    const serial = findAuthorizedSerial(devices)
    if (serial) return { kind: 'connected', serial }
    if (devices.length > 0) return { kind: 'unauthorized' }
    return { kind: 'disconnected' }
  }
}

function statusEquals(a: ConnectionStatus, b: ConnectionStatus): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'connected' && b.kind === 'connected') return a.serial === b.serial
  return true
}
