export interface TransferSnapshot {
  status: 'running' | 'completed'
  totalFiles: number
  completedFiles: number
  currentFile?: {
    path: string
    bytesTransferred: number
    totalBytes: number
  }
}
