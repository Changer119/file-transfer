import { useEffect, useState } from 'react'
import type { TransferSnapshot } from '@shared/transferTypes'

export function TransferPanel({ disabled }: { disabled: boolean }): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<TransferSnapshot>()

  useEffect(() => window.api.onTransferSnapshotChange(setSnapshot), [])

  function handleTransfer(): void {
    window.api.startTransfer().catch(() => undefined)
  }

  const busy = snapshot?.status === 'running' || snapshot?.status === 'interrupted'

  return (
    <div>
      <button type="button" onClick={handleTransfer} disabled={disabled || busy}>
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
          {snapshot.status === 'interrupted' && <p>设备已断开，等待重新连接后自动继续传输</p>}
        </div>
      )}
    </div>
  )
}
