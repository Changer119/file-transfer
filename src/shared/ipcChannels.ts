export const IPC_CHANNELS = {
  getDeviceStatus: 'device:get-status',
  deviceStatusChanged: 'device:status-changed',
  discardInterruptedTask: 'device:discard-interrupted-task',
  listDirectory: 'device:list-directory',
  getThumbnail: 'device:get-thumbnail',
  toggleSelection: 'selection:toggle',
  selectAllInFolder: 'selection:select-all',
  invertSelectionInFolder: 'selection:invert',
  startTransfer: 'transfer:start',
  transferSnapshotChanged: 'transfer:snapshot-changed'
} as const
