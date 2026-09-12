import { useEffect, useRef, useState } from 'react'
import { classifyFileKind } from '@shared/fileKind'

// FileListView 的 ROW_HEIGHT / GRID_TEMPLATE_COLUMNS 要跟着这个尺寸一起改。
export const THUMBNAIL_SIZE = 96

/**
 * 缩略图（issue #10）：一个目录可能有几千个文件，逐行都立刻去请求缩略图会
 * 把 adb/ffmpeg 打满。用 IntersectionObserver 懒加载——只有这一行真的滚动
 * 到可见区域时才发起一次 getThumbnail 请求，且只发起一次。
 *
 * 大视频（issue #13）：超过 thumbnailProvider 里那个大小阈值的视频，主进程
 * 会直接返回 undefined（不尝试下载），这里跟"抽帧失败"走同一个降级展示——
 * 反正对用户来说都是"这个视频没有真实缩略图，看图标就行"，没必要在 UI 上
 * 区分"失败"和"太大不做"这两种原因。
 */
export function FileThumbnail({
  name,
  path,
  sizeBytes
}: {
  name: string
  path: string
  sizeBytes: number
}): React.JSX.Element | null {
  const kind = classifyFileKind(name)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState<string>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || kind === 'other') return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [kind])

  useEffect(() => {
    if (!visible) return
    let ignore = false
    window.api
      .getThumbnail(path, sizeBytes)
      .then((dataUrl) => {
        if (ignore) return
        if (dataUrl) setSrc(dataUrl)
        else setFailed(true)
      })
      .catch(() => {
        if (!ignore) setFailed(true)
      })
    return () => {
      ignore = true
    }
  }, [visible, path, sizeBytes])

  if (kind === 'other') return null

  const loading = visible && !src && !failed

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-lg"
      style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
    >
      {src && (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
        />
      )}
      {loading && (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
      )}
      {!src && failed && <span>{kind === 'video' ? '🎬' : '🖼️'}</span>}
    </div>
  )
}
