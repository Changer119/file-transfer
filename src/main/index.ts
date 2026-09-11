import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { logger } from './logger'
import { AdbDeviceClient } from './device/adbDeviceClient'
import { DeviceMonitor } from './device/deviceMonitor'
import { registerDeviceIpc } from './ipc/deviceIpc'
import { registerDirectoryIpc } from './ipc/directoryIpc'
import { registerSelectionIpc } from './ipc/selectionIpc'
import { registerThumbnailIpc } from './ipc/thumbnailIpc'
import { registerTransferIpc } from './ipc/transferIpc'
import { SelectionState } from './transfer/selectionState'
import { TransferEngine } from './transfer/transferEngine'

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs')
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  logger.info('app ready')

  // 进程级单例：设备连接、选择状态等跟随 App 生命周期，而不是某个具体窗口。
  const client = new AdbDeviceClient()
  const selection = new SelectionState()
  const monitor = new DeviceMonitor(client)
  const engine = new TransferEngine(client)

  // 断线自动续传（issue #7）：同一序列号的设备重新连接后，交给
  // TransferEngine 自行判断是否有等待续传的任务，无需用户点击任何按钮。
  monitor.onStatusChange((status) => {
    if (status.kind === 'connected') engine.onDeviceReconnected(status.serial)
  })

  let currentWindow = createWindow()
  const getCurrentWindow = (): BrowserWindow => currentWindow

  // ipcMain.handle 只在这里注册一次；重复注册同一个 channel 会直接抛错。
  registerDeviceIpc(getCurrentWindow, monitor, engine)
  registerDirectoryIpc(client)
  registerThumbnailIpc(client)
  registerSelectionIpc(selection)
  registerTransferIpc(getCurrentWindow, engine, selection)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) currentWindow = createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
