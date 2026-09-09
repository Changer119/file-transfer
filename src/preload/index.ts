import { contextBridge, ipcRenderer } from 'electron'
import type { ConnectionStatus } from '@shared/deviceTypes'
import { IPC_CHANNELS } from '@shared/ipcChannels'

const api = {
  getDeviceStatus: (): Promise<ConnectionStatus> => ipcRenderer.invoke(IPC_CHANNELS.getDeviceStatus),
  onDeviceStatusChange: (callback: (status: ConnectionStatus) => void): (() => void) => {
    const listener = (_event: unknown, status: ConnectionStatus) => callback(status)
    ipcRenderer.on(IPC_CHANNELS.deviceStatusChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.deviceStatusChanged, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
