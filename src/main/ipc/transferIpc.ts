import { dialog, ipcMain, type BrowserWindow } from 'electron'
import type { SelectionState } from '../transfer/selectionState'
import type { TransferEngine } from '../transfer/transferEngine'
import { IPC_CHANNELS } from '@shared/ipcChannels'

export function registerTransferIpc(
  getWindow: () => BrowserWindow,
  engine: TransferEngine,
  selection: SelectionState
): void {
  engine.onSnapshotChange((snapshot) => {
    const window = getWindow()
    if (!window.isDestroyed()) window.webContents.send(IPC_CHANNELS.transferSnapshotChanged, snapshot)
  })

  ipcMain.handle(IPC_CHANNELS.startTransfer, async () => {
    const result = await dialog.showOpenDialog(getWindow(), { properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return

    const destinationDir = result.filePaths[0]
    if (!destinationDir) return
    await engine.run(selection.selectedPaths(), destinationDir)
  })
}
