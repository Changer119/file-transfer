import { useMemo, useState } from 'react'
import type { BrowsableLocation } from '@shared/browsableLocations'
import type { FileEntry } from '@shared/fileEntry'
import { BrowsableLocationList } from './BrowsableLocationList'
import { FileListView } from './FileListView'
import { RangeSelectForm } from './RangeSelectForm'
import { TransferPanel } from './TransferPanel'

type SortKey = 'default' | 'size' | 'time'
type SortDirection = 'asc' | 'desc'

export function DeviceBrowser(): React.JSX.Element {
  const [selected, setSelected] = useState<BrowsableLocation>()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // 排序只影响展示顺序，不影响 SelectionState 本身；但 RangeSelectForm 的
  // "#" 序号必须和 FileListView 实际渲染的顺序完全一致，所以两者都要传
  // 排序后的这份数组，而不是 listDirectory 原始返回的顺序。
  const sortedEntries = useMemo(() => {
    if (sortKey === 'default') return entries
    const direction = sortDirection === 'asc' ? 1 : -1
    return [...entries].sort((a, b) => {
      const diff = sortKey === 'size' ? a.sizeBytes - b.sizeBytes : a.modifiedAtMs - b.modifiedAtMs
      return diff * direction
    })
  }, [entries, sortKey, sortDirection])

  function applySelection(result: Promise<string[]>): void {
    result.then((paths) => setSelectedPaths(new Set(paths)))
  }

  // Directories aren't a selectable/transferable unit, so selection actions
  // are scoped to files only.
  function currentFolderFilePaths(): string[] {
    return sortedEntries.filter((entry) => !entry.isDirectory).map((entry) => entry.path)
  }

  function handleSelect(location: BrowsableLocation): void {
    setSelected(location)
    window.api.listDirectory(location.path).then(setEntries)
  }

  function handleToggle(path: string): void {
    applySelection(window.api.toggleSelection(path))
  }

  function handleSelectAll(): void {
    applySelection(window.api.selectAllInFolder(currentFolderFilePaths()))
  }

  function handleInvertSelection(): void {
    applySelection(window.api.invertSelectionInFolder(currentFolderFilePaths()))
  }

  function handleSelectRange(paths: string[]): void {
    applySelection(window.api.selectAllInFolder(paths))
  }

  return (
    <div>
      <BrowsableLocationList selectedPath={selected?.path} onSelect={handleSelect} />
      <p>已选择 {selectedPaths.size} 个文件</p>
      <TransferPanel disabled={selectedPaths.size === 0} />
      {selected && (
        <>
          <button type="button" onClick={handleSelectAll}>
            全选
          </button>
          <button type="button" onClick={handleInvertSelection}>
            反选
          </button>
          <RangeSelectForm entries={sortedEntries} onSelectRange={handleSelectRange} />
          <span>
            排序：
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="default">默认</option>
              <option value="size">按大小</option>
              <option value="time">按修改时间</option>
            </select>
            {sortKey !== 'default' && (
              <button
                type="button"
                onClick={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
              >
                {sortDirection === 'asc' ? '↑ 升序' : '↓ 降序'}
              </button>
            )}
          </span>
          <FileListView entries={sortedEntries} selectedPaths={selectedPaths} onToggle={handleToggle} />
        </>
      )}
    </div>
  )
}
