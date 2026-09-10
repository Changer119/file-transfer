import { ipcMain, type BrowserWindow } from 'electron'
import type { ConnectionStatus } from '@shared/deviceTypes'
import type { DeviceMonitor } from '../device/deviceMonitor'
import type { TransferEngine } from '../transfer/transferEngine'
import { IPC_CHANNELS } from '@shared/ipcChannels'

const POLL_INTERVAL_MS = 1500

/**
 * 续传等待期间插入不同设备的处理（issue #8）：任务处于 interrupted 状态时，
 * 一个不同序列号的新设备接入本应报告为 connected——但那会让渲染进程直接
 * 放出"浏览设备"界面，静默丢弃旧任务的归属信息。这里把这种情况改写成
 * foreign-device-pending，渲染进程据此弹出确认框，而不是把冲突判断散落
 * 到 UI 层。真正无冲突的 connected（比如 #7 场景下同一序列号重连）原样放行。
 */
function resolveStatus(status: ConnectionStatus, engine: TransferEngine): ConnectionStatus {
  if (status.kind !== 'connected') return status
  const owner = engine.interruptedOwnerSerial()
  if (owner !== undefined && owner !== status.serial) {
    return { kind: 'foreign-device-pending', serial: status.serial }
  }
  return status
}

export function registerDeviceIpc(
  getWindow: () => BrowserWindow,
  monitor: DeviceMonitor,
  engine: TransferEngine
): () => void {
  function pushStatus(rawStatus: ConnectionStatus): void {
    const window = getWindow()
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.deviceStatusChanged, resolveStatus(rawStatus, engine))
    }
  }

  ipcMain.handle(IPC_CHANNELS.getDeviceStatus, async () => resolveStatus(await monitor.refresh(), engine))

  // discardInterruptedTask 之后要重新推送"当前已知的原始连接状态"（DeviceMonitor
  // 本身不会因为放弃任务这件事而重新触发 onStatusChange——它看到的 adb 层连接
  // 状态压根没变），直接读 DeviceMonitor 自己记的最新状态，而不是另外维护一份。
  ipcMain.handle(IPC_CHANNELS.discardInterruptedTask, () => {
    engine.discardInterruptedTask()
    pushStatus(monitor.currentStatus())
  })

  monitor.onStatusChange(pushStatus)

  const pollTimer = setInterval(() => {
    monitor.refresh().catch(() => undefined)
  }, POLL_INTERVAL_MS)

  return () => clearInterval(pollTimer)
}
