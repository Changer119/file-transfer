export interface TransferSnapshot {
  status: 'running' | 'completed' | 'interrupted'
  totalFiles: number
  completedFiles: number
  currentFile?: {
    path: string
    bytesTransferred: number
    totalBytes: number
  }
}
