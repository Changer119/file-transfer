import type { FileEntry } from '@shared/fileEntry'
import type { DeviceClient } from './deviceClient'
import { logger } from '../logger'

/**
 * Missing/unreadable directories should render as an empty list in the UI,
 * not crash the app, so failures from the Device Client are swallowed here.
 * They're still logged so a real adb/communication failure isn't
 * indistinguishable from a genuinely empty directory when debugging.
 */
export async function listBrowsableDirectory(client: DeviceClient, path: string): Promise<FileEntry[]> {
  try {
    const entries = await client.listDirectory(path)
    // 点号开头的文件过滤掉：ls -la 会把安卓 MediaStore 遗留的 .pending-*
    // 临时/占位文件也列出来，这些是相机等 App 保存过程中断留下的内部状态，
    // 往往内容不完整或损坏，不是用户真正想浏览/传输的照片视频。
    return entries.filter((entry) => !entry.name.startsWith('.'))
  } catch (error) {
    logger.warn({ path, error }, 'listBrowsableDirectory failed, showing an empty directory instead')
    return []
  }
}
