export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  sizeBytes: number
}

export type TransferProgress = {
  bytesTransferred: number
  totalBytes: number
}

export type ProgressCallback = (progress: TransferProgress) => void
