import { describe, expect, it, vi } from 'vitest'
import { FakeDeviceClient } from '@main/device/fakeDeviceClient'
import { generateThumbnail } from '@main/device/thumbnailProvider'

describe('generateThumbnail', () => {
  it('returns the raw bytes as-is for an image file, with no processing', async () => {
    const client = new FakeDeviceClient()
    client.setFileContent('/sdcard/DCIM/Camera/photo.jpg', Buffer.from('fake-jpeg-bytes'))

    await expect(generateThumbnail(client, '/sdcard/DCIM/Camera/photo.jpg')).resolves.toEqual(
      Buffer.from('fake-jpeg-bytes')
    )
  })

  it('does not call the Device Client at all for a file that is neither an image nor a video', async () => {
    const client = new FakeDeviceClient()

    const thumbnail = await generateThumbnail(client, '/sdcard/Documents/notes.txt')

    expect(thumbnail).toBeUndefined()
    expect(client.readFileBytesCallLog()).toEqual([])
  })

  it('returns undefined instead of throwing when reading the source bytes fails', async () => {
    const client = new FakeDeviceClient()
    client.simulateReadFailure('/sdcard/DCIM/Camera/broken.jpg')

    await expect(generateThumbnail(client, '/sdcard/DCIM/Camera/broken.jpg')).resolves.toBeUndefined()
  })

  it('queues video thumbnail generation one at a time, so a second video request does not start downloading until the first one is done', async () => {
    const client = new FakeDeviceClient()
    client.setFileContent('/sdcard/DCIM/Camera/a.mp4', Buffer.from('fake-video-a'))
    client.setFileContent('/sdcard/DCIM/Camera/b.mp4', Buffer.from('fake-video-b'))
    client.holdRead('/sdcard/DCIM/Camera/a.mp4')

    const first = generateThumbnail(client, '/sdcard/DCIM/Camera/a.mp4')
    const second = generateThumbnail(client, '/sdcard/DCIM/Camera/b.mp4')

    await vi.waitFor(() => expect(client.readFileBytesCallLog()).toEqual(['/sdcard/DCIM/Camera/a.mp4']))
    // a.mp4 的下载还卡着没释放，b.mp4 不应该已经开始下载——证明是排队而不是并发
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(client.readFileBytesCallLog()).toEqual(['/sdcard/DCIM/Camera/a.mp4'])

    client.releaseRead('/sdcard/DCIM/Camera/a.mp4')
    await Promise.all([first, second])

    expect(client.readFileBytesCallLog()).toEqual(['/sdcard/DCIM/Camera/a.mp4', '/sdcard/DCIM/Camera/b.mp4'])
  })

  it('does not queue image thumbnails behind a pending video extraction', async () => {
    const client = new FakeDeviceClient()
    client.setFileContent('/sdcard/DCIM/Camera/a.mp4', Buffer.from('fake-video-a'))
    client.setFileContent('/sdcard/DCIM/Camera/photo.jpg', Buffer.from('fake-jpeg-bytes'))
    client.holdRead('/sdcard/DCIM/Camera/a.mp4')

    const video = generateThumbnail(client, '/sdcard/DCIM/Camera/a.mp4')
    await expect(generateThumbnail(client, '/sdcard/DCIM/Camera/photo.jpg')).resolves.toEqual(
      Buffer.from('fake-jpeg-bytes')
    )

    client.releaseRead('/sdcard/DCIM/Camera/a.mp4')
    await video
  })
})
