import type { ConnectionStatus } from '@shared/deviceTypes'

interface DeviceStatusViewProps {
  status: ConnectionStatus
  onDiscardInterruptedTask: () => void
}

export function DeviceStatusView({ status, onDiscardInterruptedTask }: DeviceStatusViewProps): React.JSX.Element {
  switch (status.kind) {
    case 'connected':
      return <p>已连接（序列号：{status.serial}）</p>
    case 'unauthorized':
      return <p>检测到设备，但尚未授权。请在手机上开启"开发者选项 → USB 调试"，并在弹出的对话框中允许这台电脑。</p>
    case 'adb-not-found':
      return <p>未检测到 adb，请安装 Android Platform Tools 并将其加入 PATH。</p>
    case 'disconnected':
      // adb 在协议层看不到未开启 USB 调试的设备，因此"未插入"与"插入但未开启调试"
      // 在这里被合并为同一个状态，文案里直接给出开启调试的引导（见 docs/adr/0004）。
      return (
        <p>
          未连接。如果已用数据线插入手机但没有反应，请在手机上确认已开启"设置 → 开发者选项 → USB 调试"。
        </p>
      )
    case 'foreign-device-pending':
      // issue #8：有一个 interrupted 任务归属另一台设备，在用户明确选择放弃前
      // 不能把这部新设备当作 connected 处理（App.tsx 靠这个状态阻止渲染 DeviceBrowser）。
      return (
        <div role="alertdialog">
          <p>检测到有未完成的传输任务属于另一台设备，是否放弃该任务？放弃后才能操作这部新连接的手机（序列号：{status.serial}）。</p>
          <button onClick={onDiscardInterruptedTask}>放弃旧任务</button>
        </div>
      )
  }
}
