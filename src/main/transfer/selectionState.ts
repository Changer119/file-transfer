/**
 * Accumulated cross-folder file selection, per issue #1's Implementation
 * Decisions: selection persists while browsing between folders; "select
 * all" / "invert" only ever touch the currently open folder's files.
 */
export class SelectionState {
  private readonly selected = new Set<string>()

  toggle(path: string): void {
    if (this.selected.has(path)) this.selected.delete(path)
    else this.selected.add(path)
  }

  selectAllInFolder(folderPaths: string[]): void {
    for (const path of folderPaths) this.selected.add(path)
  }

  invertSelectionInFolder(folderPaths: string[]): void {
    for (const path of folderPaths) this.toggle(path)
  }

  isSelected(path: string): boolean {
    return this.selected.has(path)
  }

  selectedPaths(): string[] {
    return [...this.selected]
  }
}
