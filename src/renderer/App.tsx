import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '@shared/deviceTypes'
import { DeviceStatusView } from './components/DeviceStatusView'
import { DeviceBrowser } from './components/DeviceBrowser'

export function App(): React.JSX.Element {
  const [status, setStatus] = useState<ConnectionStatus>({ kind: 'disconnected' })

  useEffect(() => {
    window.api.getDeviceStatus().then(setStatus)
    return window.api.onDeviceStatusChange(setStatus)
  }, [])

  return (
    <main>
      <h1>File Transfer</h1>
      <DeviceStatusView status={status} />
      {status.kind === 'connected' && <DeviceBrowser />}
    </main>
  )
}
