import { ipcMain } from 'electron'
import type { DeleteFilesResult } from '@shared/fileDeletion'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import type { DeviceClient } from '../device/deviceClient'
import type { SelectionState } from '../transfer/selectionState'

/**
 * 按序号范围批量删除手机源文件（用户主动发起，跟 issue #6/#11 里"传输成功
 * 自动删除"是两回事）。一个文件删除失败不影响其余文件继续删除；删除成功的
 * 路径要同步从 SelectionState 里清掉，否则后续一键传输会对着已经不存在的
 * 幽灵路径调用 pushFile。
 *
 * 逐个顺序调用 deleteFile，不并发——跟 TransferEngine.processQueue() 一贯
 * "同一时刻只对设备发一个请求"的风格保持一致，避免选中几百上千个文件时
 * 一次性打出海量并发 adb 调用，把设备打崩溃或者引发一堆本可避免的失败。
 */
export function registerFileDeletionIpc(client: DeviceClient, selection: SelectionState): void {
  ipcMain.handle(IPC_CHANNELS.deleteFiles, async (_event, paths: string[]): Promise<DeleteFilesResult> => {
    const succeeded: string[] = []
    const failed: string[] = []

    for (const path of paths) {
      try {
        await client.deleteFile(path)
        succeeded.push(path)
      } catch {
        failed.push(path)
      }
    }

    selection.removePaths(succeeded)
    return { succeeded, failed, selectedPaths: selection.selectedPaths() }
  })
}
