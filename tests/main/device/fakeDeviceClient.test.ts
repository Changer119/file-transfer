import { describe, expect, it } from 'vitest'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'

describe('FakeDeviceClient', () => {
  it('getSerialNumber returns the authorized device serial, ignoring unauthorized ones', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([
      { serial: 'UNAUTH1', authorized: false },
      { serial: 'ABC123', authorized: true }
    ])

    await expect(client.getSerialNumber()).resolves.toBe('ABC123')
  })

  it('getSerialNumber returns undefined when no device is authorized', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'UNAUTH1', authorized: false }])

    await expect(client.getSerialNumber()).resolves.toBeUndefined()
  })

  it('isConnected is true only for a serial that is currently authorized', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'ABC123', authorized: true }])

    await expect(client.isConnected('ABC123')).resolves.toBe(true)
    await expect(client.isConnected('OTHER')).resolves.toBe(false)
  })
})
