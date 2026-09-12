import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FileEntry } from '@shared/fileEntry'
import { FileThumbnail, THUMBNAIL_SIZE } from './FileThumbnail'

const ROW_PADDING = 8
// 序号 / 勾选框 / 缩略图 / 名称 / 类型 / 大小 / 修改时间
const GRID_TEMPLATE_COLUMNS = `48px 32px ${THUMBNAIL_SIZE + ROW_PADDING}px 1fr 80px 96px 140px`
const ROW_HEIGHT = THUMBNAIL_SIZE + ROW_PADDING

/**
 * 目录可能有几千个文件（issue #10 真机验证撞过一次 V8 OOM 崩溃：全部渲染成
 * 真实 DOM 行 + 每行挂一个缩略图组件，内存直接打爆）。改用 @tanstack/react-virtual
 * 只渲染当前滚动到的可见行，代价是放弃 <table> 语义、改用 CSS Grid 模拟表格列对齐。
 */
export function FileListView({
  entries,
  selectedPaths,
  onToggle
}: {
  entries: FileEntry[]
  selectedPaths: Set<string>
  onToggle: (path: string) => void
}): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10
  })

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
        这个目录是空的，或者手机上没有这个目录。
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div
        className="border-b border-gray-200 px-3 py-2 text-xs font-medium tracking-wide text-gray-500 uppercase"
        style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}
      >
        <span>#</span>
        <span></span>
        <span></span>
        <span>名称</span>
        <span>类型</span>
        <span>大小</span>
        <span>修改时间</span>
      </div>
      <div ref={scrollRef} style={{ height: '70vh', overflowY: 'auto', position: 'relative' }}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = entries[virtualRow.index]
            if (!entry) return null
            const selected = selectedPaths.has(entry.path)
            return (
              <div
                key={entry.path}
                className={`border-b border-gray-100 px-3 text-sm ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                  alignItems: 'center'
                }}
              >
                <span className="text-gray-400">{virtualRow.index + 1}</span>
                <span>
                  {!entry.isDirectory && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggle(entry.path)}
                      aria-label={`选择 ${entry.name}`}
                      className="h-4 w-4 cursor-pointer rounded accent-blue-600"
                    />
                  )}
                </span>
                <span>{!entry.isDirectory && <FileThumbnail name={entry.name} path={entry.path} />}</span>
                <span className="truncate font-medium text-gray-900" title={entry.name}>
                  {entry.name}
                </span>
                <span className="text-gray-500">{fileType(entry)}</span>
                <span className="text-gray-500">{formatSize(entry.sizeBytes)}</span>
                <span className="text-gray-500">{formatModifiedAt(entry.modifiedAtMs)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function fileType(entry: FileEntry): string {
  if (entry.isDirectory) return '文件夹'
  const dotIndex = entry.name.lastIndexOf('.')
  return dotIndex > 0 ? entry.name.slice(dotIndex + 1).toUpperCase() : '文件'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatModifiedAt(modifiedAtMs: number): string {
  if (!modifiedAtMs) return ''
  const date = new Date(modifiedAtMs)
  const pad = (value: number): string => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
