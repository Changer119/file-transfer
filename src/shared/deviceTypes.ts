export interface DeviceInfo {
  serial: string
  authorized: boolean
}

export type ConnectionStatus =
  | { kind: 'disconnected' }
  | { kind: 'unauthorized' }
  | { kind: 'connected'; serial: string }
  | { kind: 'adb-not-found' }
  | { kind: 'foreign-device-pending'; serial: string }
