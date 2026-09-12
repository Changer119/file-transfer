import { useState } from 'react'
import type { FileEntry } from '@shared/fileEntry'

/**
 * 按 FileListView 里显示的 "#" 序号选一段区间（1-based，含首尾）。区间里的
 * 文件夹会被跳过——序号列本身不区分文件/文件夹，但选择这件事只对文件有意义。
 */
export function RangeSelectForm({
  entries,
  onSelectRange
}: {
  entries: FileEntry[]
  onSelectRange: (paths: string[]) => void
}): React.JSX.Element {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  function handleSubmit(): void {
    const startIndex = Number.parseInt(start, 10)
    const endIndex = Number.parseInt(end, 10)
    if (!Number.isInteger(startIndex) || !Number.isInteger(endIndex)) return
    if (startIndex < 1 || endIndex < startIndex || endIndex > entries.length) return

    const paths = entries
      .slice(startIndex - 1, endIndex)
      .filter((entry) => !entry.isDirectory)
      .map((entry) => entry.path)
    onSelectRange(paths)
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
        onClick={handleSubmit}
        className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        按序号选择
      </button>
    </div>
  )
}
