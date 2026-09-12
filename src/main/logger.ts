import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { destination, pino, stdSerializers } from 'pino'

const logsDir = join(process.cwd(), 'logs')
mkdirSync(logsDir, { recursive: true })

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    // pino 内建的 err 序列化器默认只认字段名 "err"；仓库里到处传的是
    // "error"，不显式配置的话 Error 对象会被当成普通 object 序列化，
    // message/stack 这些不可枚举属性全部丢失，日志里只剩一个空 {}。
    serializers: { error: stdSerializers.err }
  },
  destination(join(logsDir, 'main.log'))
)
