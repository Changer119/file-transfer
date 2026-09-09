import type { ConnectionStatus } from '@shared/deviceTypes'

export function DeviceStatusView({ status }: { status: ConnectionStatus }): React.JSX.Element {
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
  }
}
