import { BROWSABLE_LOCATIONS, type BrowsableLocation } from '@shared/browsableLocations'

export function BrowsableLocationList({
  selectedPath,
  onSelect
}: {
  selectedPath: string | undefined
  onSelect: (location: BrowsableLocation) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {BROWSABLE_LOCATIONS.map((location) => {
        const active = location.path === selectedPath
        return (
          <button
            key={location.path}
            type="button"
            onClick={() => onSelect(location)}
            aria-pressed={active}
            className={
              active
                ? 'rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm'
                : 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
            }
          >
            {location.label}
          </button>
        )
      })}
    </div>
  )
}
