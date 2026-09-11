import { describe, expect, it } from 'vitest'
import { classifyFileKind } from '@shared/fileKind'

describe('classifyFileKind', () => {
  it('classifies common image extensions as image, case-insensitively', () => {
    expect(classifyFileKind('/sdcard/DCIM/Camera/photo.jpg')).toBe('image')
    expect(classifyFileKind('photo.JPEG')).toBe('image')
    expect(classifyFileKind('photo.png')).toBe('image')
    expect(classifyFileKind('photo.webp')).toBe('image')
  })

  it('classifies common video extensions as video, case-insensitively', () => {
    expect(classifyFileKind('/sdcard/DCIM/Camera/clip.mp4')).toBe('video')
    expect(classifyFileKind('clip.MOV')).toBe('video')
  })

  it('classifies anything else, including extensionless names, as other', () => {
    expect(classifyFileKind('notes.txt')).toBe('other')
    expect(classifyFileKind('no-extension')).toBe('other')
  })
})
