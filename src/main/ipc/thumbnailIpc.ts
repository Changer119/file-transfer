import { ipcMain } from 'electron'
import { classifyFileKind } from '@shared/fileKind'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import type { DeviceClient } from '../device/deviceClient'
import { generateThumbnail } from '../device/thumbnailProvider'

const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  heic: 'image/heic'
}

export function registerThumbnailIpc(client: DeviceClient): void {
  ipcMain.handle(
    IPC_CHANNELS.getThumbnail,
    async (_event, path: string, sizeBytes: number): Promise<string | undefined> => {
      const kind = classifyFileKind(path)
      const bytes = await generateThumbnail(client, path, sizeBytes)
      if (!bytes) return undefined
      return `data:${resolveMimeType(path, kind)};base64,${bytes.toString('base64')}`
    }
  )
}

function resolveMimeType(path: string, kind: ReturnType<typeof classifyFileKind>): string {
  if (kind === 'video') return 'image/jpeg' // ffmpeg 抽帧固定输出 JPEG
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  return IMAGE_MIME_TYPES[extension] ?? 'image/jpeg'
}
