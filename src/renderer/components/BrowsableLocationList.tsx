import { BROWSABLE_LOCATIONS, type BrowsableLocation } from '@shared/browsableLocations'

export function BrowsableLocationList({
  selectedPath,
  onSelect
}: {
  selectedPath: string | undefined
  onSelect: (location: BrowsableLocation) => void
}): React.JSX.Element {
  return (
    <ul>
      {BROWSABLE_LOCATIONS.map((location) => (
        <li key={location.path}>
          <button type="button" onClick={() => onSelect(location)} aria-pressed={location.path === selectedPath}>
            {location.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
