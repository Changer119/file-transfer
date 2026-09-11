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

  it('holdPush only blocks the next pushFile() call for that path, not a later one after release', async () => {
    const client = new FakeDeviceClient()
    client.holdPush('/sdcard/DCIM/a.jpg')

    const firstPush = client.pushFile('/sdcard/DCIM/a.jpg', '/dest/a.jpg', () => undefined)
    client.releasePush('/sdcard/DCIM/a.jpg')
    await firstPush

    await expect(client.pushFile('/sdcard/DCIM/a.jpg', '/dest/a.jpg', () => undefined)).resolves.toBeUndefined()
  })

  it('simulateDisconnect removes the device and rejects any pushFile currently held for it', async () => {
    const client = new FakeDeviceClient()
    client.setDevices([{ serial: 'ABC123', authorized: true }])
    client.holdPush('/sdcard/DCIM/a.jpg')

    const push = client.pushFile('/sdcard/DCIM/a.jpg', '/dest/a.jpg', () => undefined)
    client.simulateDisconnect('ABC123')

    await expect(push).rejects.toThrow()
    await expect(client.isConnected('ABC123')).resolves.toBe(false)
    await expect(client.listDevices()).resolves.toEqual([])
  })

  it('readFileBytes returns the bytes previously registered via setFileContent for that path', async () => {
    const client = new FakeDeviceClient()
    client.setFileContent('/sdcard/DCIM/Camera/photo.jpg', Buffer.from('fake-jpeg-bytes'))

    await expect(client.readFileBytes('/sdcard/DCIM/Camera/photo.jpg')).resolves.toEqual(
      Buffer.from('fake-jpeg-bytes')
    )
  })

  it('readFileBytes rejects for a path with no registered content', async () => {
    const client = new FakeDeviceClient()

    await expect(client.readFileBytes('/sdcard/DCIM/Camera/missing.jpg')).rejects.toThrow()
  })

  it('simulateReadFailure makes readFileBytes reject even for a path with registered content', async () => {
    const client = new FakeDeviceClient()
    client.setFileContent('/sdcard/DCIM/Camera/photo.jpg', Buffer.from('fake-jpeg-bytes'))
    client.simulateReadFailure('/sdcard/DCIM/Camera/photo.jpg')

    await expect(client.readFileBytes('/sdcard/DCIM/Camera/photo.jpg')).rejects.toThrow()
  })
})
