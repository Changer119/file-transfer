import { ipcMain } from 'electron'
import type { SelectionState } from '../transfer/selectionState'
import { IPC_CHANNELS } from '@shared/ipcChannels'

export function registerSelectionIpc(state: SelectionState): void {
  ipcMain.handle(IPC_CHANNELS.toggleSelection, (_event, path: string) => {
    state.toggle(path)
    return state.selectedPaths()
  })

  ipcMain.handle(IPC_CHANNELS.selectAllInFolder, (_event, folderPaths: string[]) => {
    state.selectAllInFolder(folderPaths)
    return state.selectedPaths()
  })

  ipcMain.handle(IPC_CHANNELS.invertSelectionInFolder, (_event, folderPaths: string[]) => {
    state.invertSelectionInFolder(folderPaths)
    return state.selectedPaths()
  })
}
