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
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">File Transfer</h1>
        <div className="mt-6">
          <DeviceStatusView status={status} onDiscardInterruptedTask={() => window.api.discardInterruptedTask()} />
        </div>
        {status.kind === 'connected' && (
          <div className="mt-6">
            <DeviceBrowser />
          </div>
        )}
      </div>
    </main>
  )
}
