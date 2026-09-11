export type FileKind = 'image' | 'video' | 'other'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', '3gp', 'mkv', 'avi', 'm4v'])

/** 缩略图（issue #10）：只用文件名后缀判断类型，不读取文件内容。 */
export function classifyFileKind(name: string): FileKind {
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex <= 0) return 'other'
  const extension = name.slice(dotIndex + 1).toLowerCase()
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (VIDEO_EXTENSIONS.has(extension)) return 'video'
  return 'other'
}
