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

  return (
    <span>
      <input
        type="number"
        min={1}
        max={entries.length}
        value={start}
        onChange={(event) => setStart(event.target.value)}
        aria-label="起始序号"
        style={{ width: 60 }}
      />
      至
      <input
        type="number"
        min={1}
        max={entries.length}
        value={end}
        onChange={(event) => setEnd(event.target.value)}
        aria-label="结束序号"
        style={{ width: 60 }}
      />
      <button type="button" onClick={handleSubmit}>
        按序号选择
      </button>
    </span>
  )
}
