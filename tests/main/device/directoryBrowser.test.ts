import { describe, expect, it } from 'vitest'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { listBrowsableDirectory } from '@main/device/directoryBrowser'

describe('listBrowsableDirectory', () => {
  it('returns the entries reported by the Device Client for that path', async () => {
    const client = new FakeDeviceClient()
    client.setDirectory('/sdcard/DCIM', [
      { name: 'photo.jpg', path: '/sdcard/DCIM/photo.jpg', isDirectory: false, sizeBytes: 2048, modifiedAtMs: 1000 }
    ])

    const entries = await listBrowsableDirectory(client, '/sdcard/DCIM')

    expect(entries).toEqual([
      { name: 'photo.jpg', path: '/sdcard/DCIM/photo.jpg', isDirectory: false, sizeBytes: 2048, modifiedAtMs: 1000 }
    ])
  })

  it('returns an empty list instead of throwing when the directory does not exist', async () => {
    const client = new FakeDeviceClient()
    client.simulateDirectoryNotFound('/sdcard/Missing')

    const entries = await listBrowsableDirectory(client, '/sdcard/Missing')

    expect(entries).toEqual([])
  })

  it('returns an empty list for a directory that exists but has no files', async () => {
    const client = new FakeDeviceClient()
    client.setDirectory('/sdcard/Empty', [])

    const entries = await listBrowsableDirectory(client, '/sdcard/Empty')

    expect(entries).toEqual([])
  })

  it('filters out dotfiles, such as Android MediaStore .pending-* leftovers, from the listing', async () => {
    const client = new FakeDeviceClient()
    client.setDirectory('/sdcard/DCIM/Camera', [
      {
        name: 'photo.jpg',
        path: '/sdcard/DCIM/Camera/photo.jpg',
        isDirectory: false,
        sizeBytes: 2048,
        modifiedAtMs: 1000
      },
      {
        name: '.pending-1671338824208-VID_20221211_124704.mp4',
        path: '/sdcard/DCIM/Camera/.pending-1671338824208-VID_20221211_124704.mp4',
        isDirectory: false,
        sizeBytes: 0,
        modifiedAtMs: 2000
      }
    ])

    const entries = await listBrowsableDirectory(client, '/sdcard/DCIM/Camera')

    expect(entries).toEqual([
      {
        name: 'photo.jpg',
        path: '/sdcard/DCIM/Camera/photo.jpg',
        isDirectory: false,
        sizeBytes: 2048,
        modifiedAtMs: 1000
      }
    ])
  })
})
