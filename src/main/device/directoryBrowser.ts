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
    return await client.listDirectory(path)
  } catch (error) {
    logger.warn({ path, error }, 'listBrowsableDirectory failed, showing an empty directory instead')
    return []
  }
}
