import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const appState = vi.hoisted(() => ({ isPackaged: false }))

vi.mock('electron', () => ({
  app: appState
}))

import { ensureCommandPath } from '@main/env/ensureCommandPath'

describe('ensureCommandPath', () => {
  const originalPath = process.env.PATH

  beforeEach(() => {
    appState.isPackaged = false
  })

  afterEach(() => {
    process.env.PATH = originalPath
  })

  it('does nothing when running unpackaged (dev mode)', () => {
    process.env.PATH = '/usr/bin:/bin'
    appState.isPackaged = false

    ensureCommandPath()

    expect(process.env.PATH).toBe('/usr/bin:/bin')
  })

  it('prepends Homebrew bin dirs when packaged and PATH is missing them', () => {
    process.env.PATH = '/usr/bin:/bin'
    appState.isPackaged = true

    ensureCommandPath()

    expect(process.env.PATH).toBe('/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin')
  })

  it('does not duplicate Homebrew dirs already present in PATH', () => {
    process.env.PATH = '/usr/local/bin:/usr/bin:/bin'
    appState.isPackaged = true

    ensureCommandPath()

    expect(process.env.PATH).toBe('/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/sbin:/usr/local/bin:/usr/bin:/bin')
  })
})
