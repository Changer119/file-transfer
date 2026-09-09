import { describe, expect, it } from 'vitest'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { DeviceMonitor } from '@main/device/deviceMonitor'

describe('DeviceMonitor', () => {
  it('reports connected with the serial number when an authorized device is present', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'ABC123', authorized: true }])
    const monitor = new DeviceMonitor(client)

    const status = await monitor.refresh()

    expect(status).toEqual({ kind: 'connected', serial: 'ABC123' })
  })

  it('reports disconnected when no devices are present', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([])
    const monitor = new DeviceMonitor(client)

    const status = await monitor.refresh()

    expect(status).toEqual({ kind: 'disconnected' })
  })

  it('reports unauthorized guidance when a device is present but not authorized', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'ABC123', authorized: false }])
    const monitor = new DeviceMonitor(client)

    const status = await monitor.refresh()

    expect(status).toEqual({ kind: 'unauthorized' })
  })

  it('reports adb-not-found when the adb executable is missing', async () => {
    const client = new FakeDeviceClient()
    client.simulateAdbNotFound()
    const monitor = new DeviceMonitor(client)

    const status = await monitor.refresh()

    expect(status).toEqual({ kind: 'adb-not-found' })
  })

  it('notifies listeners only when the status actually changes', async () => {
    const client = new FakeDeviceClient()
    const monitor = new DeviceMonitor(client)
    const seen: string[] = []
    monitor.onStatusChange((status) => seen.push(status.kind))

    await monitor.refresh() // disconnected -> disconnected, no change from initial state
    client.setDevices([{ serial: 'ABC123', authorized: true }])
    await monitor.refresh() // disconnected -> connected
    await monitor.refresh() // connected -> connected, no change

    expect(seen).toEqual(['connected'])
  })
})
