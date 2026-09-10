import type { FileEntry } from '@shared/fileEntry'

export function FileListView({ entries }: { entries: FileEntry[] }): React.JSX.Element {
  if (entries.length === 0) return <p>这个目录是空的，或者手机上没有这个目录。</p>

  return (
    <table>
      <thead>
        <tr>
          <th>名称</th>
          <th>类型</th>
          <th>大小</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.path}>
            <td>{entry.name}</td>
            <td>{fileType(entry)}</td>
            <td>{formatSize(entry.sizeBytes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
