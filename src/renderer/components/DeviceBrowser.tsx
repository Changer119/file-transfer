import { useState } from 'react'
import type { BrowsableLocation } from '@shared/browsableLocations'
import type { FileEntry } from '@shared/fileEntry'
import { BrowsableLocationList } from './BrowsableLocationList'
import { FileListView } from './FileListView'

export function DeviceBrowser(): React.JSX.Element {
  const [selected, setSelected] = useState<BrowsableLocation>()
  const [entries, setEntries] = useState<FileEntry[]>([])

  function handleSelect(location: BrowsableLocation): void {
    setSelected(location)
    window.api.listDirectory(location.path).then(setEntries)
  }

  return (
    <div>
      <BrowsableLocationList selectedPath={selected?.path} onSelect={handleSelect} />
      {selected && <FileListView entries={entries} />}
    </div>
  )
}
