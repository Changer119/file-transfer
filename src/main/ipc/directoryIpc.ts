import { ipcMain } from 'electron'
import type { DeviceClient } from '../device/deviceClient'
import { listBrowsableDirectory } from '../device/directoryBrowser'
import { IPC_CHANNELS } from '@shared/ipcChannels'

export function registerDirectoryIpc(client: DeviceClient): void {
  ipcMain.handle(IPC_CHANNELS.listDirectory, (_event, path: string) => listBrowsableDirectory(client, path))
}
