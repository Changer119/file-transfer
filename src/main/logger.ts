import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { destination, pino, stdSerializers } from 'pino'

// 不能用 process.cwd() 拼日志目录：从 Launchpad/Finder 启动时 macOS 给的
// cwd 是 "/"，会导致 mkdir '/logs' 报 ENOENT 而在启动阶段直接崩溃。打包场景
// 下 FILE_TRANSFER_LOGS_DIR 由 env/resolvePackagedLogsDir.ts 在 index.ts
// 最早的 import 阶段写入（指向 app.getPath('logs')，不依赖 cwd）。这里刻意
// 不直接 `import { app } from 'electron'`——那样会让每个引入 logger 的测试
// 文件都得 mock electron，logger 只是想写个文件而已。
const logsDir = process.env.FILE_TRANSFER_LOGS_DIR ?? join(process.cwd(), 'logs')
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
