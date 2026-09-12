import { useEffect, useState } from 'react'
import type { TransferSnapshot } from '@shared/transferTypes'

export function TransferPanel({ disabled }: { disabled: boolean }): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<TransferSnapshot>()

  useEffect(() => window.api.onTransferSnapshotChange(setSnapshot), [])

  function handleTransfer(): void {
    window.api.startTransfer().catch(() => undefined)
  }

  const busy = snapshot?.status === 'running' || snapshot?.status === 'interrupted'
  const currentFile = snapshot?.currentFile
  const currentFileProgress =
    currentFile && currentFile.totalBytes > 0 ? (currentFile.bytesTransferred / currentFile.totalBytes) * 100 : 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={handleTransfer}
        disabled={disabled || busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
      >
        一键传输
      </button>
      {snapshot && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-600">
            整体进度：{snapshot.completedFiles} / {snapshot.totalFiles}
          </p>
          {currentFile && currentFile.totalBytes > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${currentFileProgress}%` }} />
            </div>
          )}
          {snapshot.status === 'completed' && <p className="text-sm font-medium text-green-700">传输完成</p>}
          {snapshot.status === 'interrupted' && (
            <p className="text-sm font-medium text-amber-700">设备已断开，等待重新连接后自动继续传输</p>
          )}
        </div>
      )}
    </div>
  )
}
