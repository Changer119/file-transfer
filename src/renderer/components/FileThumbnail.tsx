import { useEffect, useRef, useState } from 'react'
import { classifyFileKind } from '@shared/fileKind'

/**
 * 缩略图（issue #10）：一个目录可能有几千个文件，逐行都立刻去请求缩略图会
 * 把 adb/ffmpeg 打满。用 IntersectionObserver 懒加载——只有这一行真的滚动
 * 到可见区域时才发起一次 getThumbnail 请求，且只发起一次。
 */
export function FileThumbnail({ name, path }: { name: string; path: string }): React.JSX.Element | null {
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
      .getThumbnail(path)
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
  }, [visible, path])

  if (kind === 'other') return null

  return (
    <div ref={containerRef} style={{ width: 48, height: 48 }}>
      {src && <img src={src} alt="" style={{ width: 48, height: 48, objectFit: 'cover' }} />}
      {!src && failed && <span>{kind === 'video' ? '🎬' : '🖼️'}</span>}
    </div>
  )
}
