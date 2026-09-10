import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { logger } from './logger'
import { AdbDeviceClient } from './device/adbDeviceClient'
import { DeviceMonitor } from './device/deviceMonitor'
import { registerDeviceIpc } from './ipc/deviceIpc'
import { registerDirectoryIpc } from './ipc/directoryIpc'

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs')
    }
  })

  const client = new AdbDeviceClient()
  registerDeviceIpc(window, new DeviceMonitor(client))
  registerDirectoryIpc(client)

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(join(import.meta.dirname,'../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  logger.info('app ready')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
