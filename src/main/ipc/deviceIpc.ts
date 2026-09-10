import { ipcMain, type BrowserWindow } from 'electron'
import type { DeviceMonitor } from '../device/deviceMonitor'
import { IPC_CHANNELS } from '@shared/ipcChannels'

const POLL_INTERVAL_MS = 1500

export function registerDeviceIpc(getWindow: () => BrowserWindow, monitor: DeviceMonitor): () => void {
  ipcMain.handle(IPC_CHANNELS.getDeviceStatus, () => monitor.refresh())

  monitor.onStatusChange((status) => {
    const window = getWindow()
    if (!window.isDestroyed()) window.webContents.send(IPC_CHANNELS.deviceStatusChanged, status)
  })

  const pollTimer = setInterval(() => {
    monitor.refresh().catch(() => undefined)
  }, POLL_INTERVAL_MS)

  return () => clearInterval(pollTimer)
}
