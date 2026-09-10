import { useState } from 'react'
import type { BrowsableLocation } from '@shared/browsableLocations'
import type { FileEntry } from '@shared/fileEntry'
import { BrowsableLocationList } from './BrowsableLocationList'
import { FileListView } from './FileListView'

export function DeviceBrowser(): React.JSX.Element {
  const [selected, setSelected] = useState<BrowsableLocation>()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  function applySelection(result: Promise<string[]>): void {
    result.then((paths) => setSelectedPaths(new Set(paths)))
  }

  // Directories aren't a selectable/transferable unit, so selection actions
  // are scoped to files only.
  function currentFolderFilePaths(): string[] {
    return entries.filter((entry) => !entry.isDirectory).map((entry) => entry.path)
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

  return (
    <div>
      <BrowsableLocationList selectedPath={selected?.path} onSelect={handleSelect} />
      <p>已选择 {selectedPaths.size} 个文件</p>
      {selected && (
        <>
          <button type="button" onClick={handleSelectAll}>
            全选
          </button>
          <button type="button" onClick={handleInvertSelection}>
            反选
          </button>
          <FileListView entries={entries} selectedPaths={selectedPaths} onToggle={handleToggle} />
        </>
      )}
    </div>
  )
}
