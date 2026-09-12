export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  sizeBytes: number
  /** 文件修改时间（mtime，epoch 毫秒）。约等于拍摄/创建时间，但文件被移动/编辑过会变。 */
  modifiedAtMs: number
}

export type TransferProgress = {
  bytesTransferred: number
  totalBytes: number
}

export type ProgressCallback = (progress: TransferProgress) => void
