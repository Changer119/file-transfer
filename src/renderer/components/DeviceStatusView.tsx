import type { ConnectionStatus } from '@shared/deviceTypes'

interface DeviceStatusViewProps {
  status: ConnectionStatus
  onDiscardInterruptedTask: () => void
}

function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'gray'; children: React.ReactNode }): React.JSX.Element {
  const toneClasses: Record<typeof tone, string> = {
    green: 'bg-green-50 text-green-700 ring-green-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    gray: 'bg-gray-100 text-gray-600 ring-gray-500/20'
  }
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

export function DeviceStatusView({ status, onDiscardInterruptedTask }: DeviceStatusViewProps): React.JSX.Element {
  switch (status.kind) {
    case 'connected':
      return <Badge tone="green">已连接（序列号：{status.serial}）</Badge>
    case 'unauthorized':
      return (
        <div className="space-y-2">
          <Badge tone="amber">检测到设备，尚未授权</Badge>
          <p className="text-sm text-gray-500">
            请在手机上开启"开发者选项 → USB 调试"，并在弹出的对话框中允许这台电脑。
          </p>
        </div>
      )
    case 'adb-not-found':
      return (
        <div className="space-y-2">
          <Badge tone="red">未检测到 adb</Badge>
          <p className="text-sm text-gray-500">请安装 Android Platform Tools 并将其加入 PATH。</p>
        </div>
      )
    case 'disconnected':
      // adb 在协议层看不到未开启 USB 调试的设备，因此"未插入"与"插入但未开启调试"
      // 在这里被合并为同一个状态，文案里直接给出开启调试的引导（见 docs/adr/0004）。
      return (
        <div className="space-y-2">
          <Badge tone="gray">未连接</Badge>
          <p className="text-sm text-gray-500">
            如果已用数据线插入手机但没有反应，请在手机上确认已开启"设置 → 开发者选项 → USB 调试"。
          </p>
        </div>
      )
    case 'foreign-device-pending':
      // issue #8：有一个 interrupted 任务归属另一台设备，在用户明确选择放弃前
      // 不能把这部新设备当作 connected 处理（App.tsx 靠这个状态阻止渲染 DeviceBrowser）。
      return (
        <div role="alertdialog" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            检测到有未完成的传输任务属于另一台设备，是否放弃该任务？放弃后才能操作这部新连接的手机（序列号：
            {status.serial}）。
          </p>
          <button
            type="button"
            onClick={onDiscardInterruptedTask}
            className="mt-3 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
          >
            放弃旧任务
          </button>
        </div>
      )
  }
}
