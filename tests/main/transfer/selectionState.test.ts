import { describe, expect, it } from 'vitest'
import { SelectionState } from '@main/transfer/selectionState'

describe('SelectionState', () => {
  it('accumulates selections made in different folders instead of replacing them', () => {
    const state = new SelectionState()

    state.toggle('/sdcard/DCIM/a.jpg')
    state.toggle('/sdcard/Download/b.jpg')

    expect(state.selectedPaths().sort()).toEqual(['/sdcard/DCIM/a.jpg', '/sdcard/Download/b.jpg'])
  })

  it('selectAllInFolder only selects the given folder\'s files, leaving other folders\' selections untouched', () => {
    const state = new SelectionState()
    state.toggle('/sdcard/Download/existing.jpg')

    state.selectAllInFolder(['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg'])

    expect(state.selectedPaths().sort()).toEqual([
      '/sdcard/DCIM/a.jpg',
      '/sdcard/DCIM/b.jpg',
      '/sdcard/Download/existing.jpg'
    ])
  })

  it('invertSelectionInFolder only flips the given folder\'s files, leaving other folders\' selections untouched', () => {
    const state = new SelectionState()
    state.toggle('/sdcard/DCIM/a.jpg') // selected, will be inverted off
    state.toggle('/sdcard/Download/x.jpg') // selected, belongs to a different folder

    state.invertSelectionInFolder(['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg'])

    expect(state.selectedPaths().sort()).toEqual(['/sdcard/DCIM/b.jpg', '/sdcard/Download/x.jpg'])
  })

  it('keeps a folder\'s selection after navigating away and back to it', () => {
    const state = new SelectionState()

    state.selectAllInFolder(['/sdcard/DCIM/a.jpg', '/sdcard/DCIM/b.jpg']) // browsing folder A
    state.selectAllInFolder(['/sdcard/Download/c.pdf']) // navigate to folder B, select there too
    // navigate back to folder A: nothing to do, SelectionState never clears on navigation

    expect(state.selectedPaths().sort()).toEqual([
      '/sdcard/DCIM/a.jpg',
      '/sdcard/DCIM/b.jpg',
      '/sdcard/Download/c.pdf'
    ])
  })
})
