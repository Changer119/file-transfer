import { useMemo, useState } from 'react'
import type { BrowsableLocation } from '@shared/browsableLocations'
import type { DeleteFilesResult } from '@shared/fileDeletion'
import type { FileEntry } from '@shared/fileEntry'
import { BrowsableLocationList } from './BrowsableLocationList'
import { FileListView } from './FileListView'
import { RangeActionsForm } from './RangeActionsForm'
import { TransferPanel } from './TransferPanel'

type SortKey = 'default' | 'size' | 'time'
type SortDirection = 'asc' | 'desc'

const secondaryButtonClasses =
  'rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'

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

  function handleFilesDeleted(result: DeleteFilesResult): void {
    const succeeded = new Set(result.succeeded)
    if (succeeded.size > 0) {
      setEntries((current) => current.filter((entry) => !succeeded.has(entry.path)))
    }
    setSelectedPaths(new Set(result.selectedPaths))
    if (result.failed.length > 0) {
      window.alert(`有 ${result.failed.length} 个文件删除失败，请稍后重试。`)
    }
  }

  return (
    <div className="space-y-6">
      <BrowsableLocationList selectedPath={selected?.path} onSelect={handleSelect} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          已选择 <span className="font-semibold text-gray-900">{selectedPaths.size}</span> 个文件
        </p>
      </div>

      <TransferPanel disabled={selectedPaths.size === 0} />

      {selected && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleSelectAll} className={secondaryButtonClasses}>
              全选
            </button>
            <button type="button" onClick={handleInvertSelection} className={secondaryButtonClasses}>
              反选
            </button>
            <RangeActionsForm
              entries={sortedEntries}
              onSelectRange={handleSelectRange}
              onFilesDeleted={handleFilesDeleted}
            />
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
              <span>排序</span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="rounded-md border-0 py-1.5 pr-8 pl-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600"
              >
                <option value="default">默认</option>
                <option value="size">按大小</option>
                <option value="time">按修改时间</option>
              </select>
              {sortKey !== 'default' && (
                <button
                  type="button"
                  onClick={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
                  className={secondaryButtonClasses}
                >
                  {sortDirection === 'asc' ? '↑ 升序' : '↓ 降序'}
                </button>
              )}
            </div>
          </div>
          <FileListView entries={sortedEntries} selectedPaths={selectedPaths} onToggle={handleToggle} />
        </div>
      )}
    </div>
  )
}
