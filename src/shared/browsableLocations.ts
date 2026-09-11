export interface BrowsableLocation {
  label: string
  path: string
}

export const BROWSABLE_LOCATIONS: BrowsableLocation[] = [
  { label: 'DCIM', path: '/sdcard/DCIM' },
  // 真机验证发现：不少厂商定制系统（如华为 EMUI）把相机实际拍摄的照片存在
  // DCIM/Camera 子目录而非 DCIM 根目录，截图存在 DCIM/Screenshots——不加
  // 这两个入口的话，用户真正想传的照片基本看不到。仍然是固定路径列表，
  // 不引入子目录浏览，与 ADR 0003 的决策一致。
  { label: '相机照片', path: '/sdcard/DCIM/Camera' },
  { label: '截图', path: '/sdcard/DCIM/Screenshots' },
  { label: '相册', path: '/sdcard/Pictures' },
  { label: '视频', path: '/sdcard/Movies' },
  { label: '下载', path: '/sdcard/Download' },
  { label: '文档', path: '/sdcard/Documents' },
  { label: '微信图片', path: '/sdcard/Pictures/WeiXin' }
]
