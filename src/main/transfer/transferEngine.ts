import { basename, join } from 'node:path'
import type { TransferSnapshot } from '@shared/transferTypes'
import type { DeviceClient } from '../device/deviceClient'
import { logger } from '../logger'

type SnapshotListener = (snapshot: TransferSnapshot) => void

interface FileState {
  path: string
  status: 'pending' | 'transferring' | 'done' | 'failed'
  bytesTransferred: number
  totalBytes: number
}

/**
 * Runs one Transfer Task: pushes the given files to destinationDir one at a
 * time, never concurrently, per issue #1's sequential-transfer decision.
 * Writing straight to `destinationDir/<filename>` is the Overwrite Policy:
 * a same-named file is replaced, never renamed or skipped.
 */
export class TransferEngine {
  private files: FileState[] = []
  private currentIndex = -1
  private status: 'running' | 'completed' = 'completed'
  private readonly listeners: SnapshotListener[] = []

  constructor(private readonly client: DeviceClient) {}

  onSnapshotChange(listener: SnapshotListener): void {
    this.listeners.push(listener)
  }

  snapshot(): TransferSnapshot {
    const current = this.files[this.currentIndex]
    return {
      status: this.status,
      totalFiles: this.files.length,
      completedFiles: this.files.filter((file) => file.status === 'done').length,
      currentFile:
        current && current.status === 'transferring'
          ? { path: current.path, bytesTransferred: current.bytesTransferred, totalBytes: current.totalBytes }
          : undefined
    }
  }

  async run(sourcePaths: string[], destinationDir: string): Promise<void> {
    if (this.status === 'running') {
      throw new Error('TransferEngine.run() called while a transfer is already in progress')
    }

    this.files = sourcePaths.map((path) => ({ path, status: 'pending', bytesTransferred: 0, totalBytes: 0 }))
    this.currentIndex = -1
    this.status = 'running'
    this.notify()

    for (const [index, file] of this.files.entries()) {
      this.currentIndex = index
      file.status = 'transferring'
      this.notify()

      const destPath = join(destinationDir, basename(file.path))
      try {
        await this.client.pushFile(file.path, destPath, (progress) => {
          file.bytesTransferred = progress.bytesTransferred
          file.totalBytes = progress.totalBytes
          this.notify()
        })
        file.status = 'done'
      } catch (error) {
        file.status = 'failed'
        logger.warn({ path: file.path, error }, 'pushFile failed, skipping to the next file')
      }
      this.notify()
    }

    this.status = 'completed'
    this.notify()
  }

  private notify(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}
