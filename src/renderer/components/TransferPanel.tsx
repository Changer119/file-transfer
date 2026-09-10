import { useEffect, useState } from 'react'
import type { TransferSnapshot } from '@shared/transferTypes'

export function TransferPanel({ disabled }: { disabled: boolean }): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<TransferSnapshot>()

  useEffect(() => window.api.onTransferSnapshotChange(setSnapshot), [])

  function handleTransfer(): void {
    window.api.startTransfer().catch(() => undefined)
  }

  const transferring = snapshot?.status === 'running'

  return (
    <div>
      <button type="button" onClick={handleTransfer} disabled={disabled || transferring}>
        一键传输
      </button>
      {snapshot && (
        <div>
          <p>
            整体进度：{snapshot.completedFiles} / {snapshot.totalFiles}
          </p>
          {snapshot.currentFile && snapshot.currentFile.totalBytes > 0 && (
            <progress value={snapshot.currentFile.bytesTransferred} max={snapshot.currentFile.totalBytes} />
          )}
          {snapshot.status === 'completed' && <p>传输完成</p>}
        </div>
      )}
    </div>
  )
}
