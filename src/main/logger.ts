import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { destination, pino } from 'pino'

const logsDir = join(process.cwd(), 'logs')
mkdirSync(logsDir, { recursive: true })

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? 'info' },
  destination(join(logsDir, 'main.log'))
)
