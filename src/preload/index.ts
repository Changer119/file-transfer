import { contextBridge, ipcRenderer } from 'electron'
import type { ConnectionStatus } from '@shared/deviceTypes'
import type { DeleteFilesResult } from '@shared/fileDeletion'
import type { FileEntry } from '@shared/fileEntry'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import type { TransferSnapshot } from '@shared/transferTypes'

const api = {
  getDeviceStatus: (): Promise<ConnectionStatus> => ipcRenderer.invoke(IPC_CHANNELS.getDeviceStatus),
  onDeviceStatusChange: (callback: (status: ConnectionStatus) => void): (() => void) => {
    const listener = (_event: unknown, status: ConnectionStatus) => callback(status)
    ipcRenderer.on(IPC_CHANNELS.deviceStatusChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.deviceStatusChanged, listener)
  },
  discardInterruptedTask: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.discardInterruptedTask),
  listDirectory: (path: string): Promise<FileEntry[]> => ipcRenderer.invoke(IPC_CHANNELS.listDirectory, path),
  getThumbnail: (path: string, sizeBytes: number): Promise<string | undefined> =>
    ipcRenderer.invoke(IPC_CHANNELS.getThumbnail, path, sizeBytes),
  deleteFiles: (paths: string[]): Promise<DeleteFilesResult> => ipcRenderer.invoke(IPC_CHANNELS.deleteFiles, paths),
  toggleSelection: (path: string): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.toggleSelection, path),
  selectAllInFolder: (folderPaths: string[]): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.selectAllInFolder, folderPaths),
  invertSelectionInFolder: (folderPaths: string[]): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.invertSelectionInFolder, folderPaths),
  startTransfer: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.startTransfer),
  onTransferSnapshotChange: (callback: (snapshot: TransferSnapshot) => void): (() => void) => {
    const listener = (_event: unknown, snapshot: TransferSnapshot) => callback(snapshot)
    ipcRenderer.on(IPC_CHANNELS.transferSnapshotChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.transferSnapshotChanged, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
