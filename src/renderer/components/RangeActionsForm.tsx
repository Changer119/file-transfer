import { useState } from 'react'
import type { FileEntry } from '@shared/fileEntry'
import type { DeleteFilesResult } from '@shared/fileDeletion'

/**
 * 按 FileListView 里显示的 "#" 序号选一段区间（1-based，含首尾），可以批量
 * 选中（用于传输）或者直接从手机删除。区间里的文件夹会被跳过——序号列本身
 * 不区分文件/文件夹，但这两个操作都只对文件有意义。
 *
 * 删除是真的从手机上删掉源文件，不经过传输流程（跟 issue #6/#11 里"传输
 * 成功后自动删除"是两回事，是用户主动发起的操作）。用一次原生 confirm 弹窗
 * 作为唯一的安全阀——个人工具场景下，多一道二次确认只会让"图省事"这个
 * 初衷落空。
 */
export function RangeActionsForm({
  entries,
  onSelectRange,
  onFilesDeleted
}: {
  entries: FileEntry[]
  onSelectRange: (paths: string[]) => void
  onFilesDeleted: (result: DeleteFilesResult) => void
}): React.JSX.Element {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [deleting, setDeleting] = useState(false)

  function rangeFilePaths(): string[] | undefined {
    const startIndex = Number.parseInt(start, 10)
    const endIndex = Number.parseInt(end, 10)
    if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) return undefined
    if (startIndex < 1 || endIndex < startIndex || endIndex > entries.length) return undefined
    return entries
      .slice(startIndex - 1, endIndex)
      .filter((entry) => !entry.isDirectory)
      .map((entry) => entry.path)
  }

  function handleSelect(): void {
    const paths = rangeFilePaths()
    if (paths) onSelectRange(paths)
  }

  function handleDelete(): void {
    const paths = rangeFilePaths()
    if (!paths || paths.length === 0) return
    const confirmed = window.confirm(`删除第 ${start}-${end} 号共 ${paths.length} 个文件？此操作不可恢复。`)
    if (!confirmed) return

    // 立刻清空输入框、进入 deleting 状态：删除会让 entries 里的序号往前移，
    // 停留的旧序号在删除完成前后都不再对应原来那批文件，必须防止误用。
    setStart('')
    setEnd('')
    setDeleting(true)
    window.api
      .deleteFiles(paths)
      .then(onFilesDeleted)
      .finally(() => setDeleting(false))
  }

  const inputClasses =
    'w-16 rounded-md border-0 px-2 py-1.5 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600'

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <input
        type="number"
        min={1}
        max={entries.length}
        value={start}
        onChange={(event) => setStart(event.target.value)}
        aria-label="起始序号"
        className={inputClasses}
      />
      <span>至</span>
      <input
        type="number"
        min={1}
        max={entries.length}
        value={end}
        onChange={(event) => setEnd(event.target.value)}
        aria-label="结束序号"
        className={inputClasses}
      />
      <button
        type="button"
        onClick={handleSelect}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        按序号选择
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300 disabled:ring-red-100"
      >
        {deleting ? '删除中…' : '按序号删除'}
      </button>
    </div>
  )
}
