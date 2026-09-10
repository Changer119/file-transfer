export interface BrowsableLocation {
  label: string
  path: string
}

export const BROWSABLE_LOCATIONS: BrowsableLocation[] = [
  { label: 'DCIM', path: '/sdcard/DCIM' },
  { label: '相册', path: '/sdcard/Pictures' },
  { label: '视频', path: '/sdcard/Movies' },
  { label: '下载', path: '/sdcard/Download' },
  { label: '文档', path: '/sdcard/Documents' },
  { label: '微信图片', path: '/sdcard/Pictures/WeiXin' }
]
