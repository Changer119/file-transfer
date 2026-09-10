export const IPC_CHANNELS = {
  getDeviceStatus: 'device:get-status',
  deviceStatusChanged: 'device:status-changed',
  listDirectory: 'device:list-directory',
  toggleSelection: 'selection:toggle',
  selectAllInFolder: 'selection:select-all',
  invertSelectionInFolder: 'selection:invert'
} as const
