import { app } from 'electron'

/**
 * 必须是 index.ts 的第一个 import，且在 `./logger` 之前——ESM 里没有自身
 * 依赖的模块会在被 import 到的那一刻立即执行完，所以这里能保证在 logger.ts
 * 读取 FILE_TRANSFER_LOGS_DIR 之前，这个环境变量已经写好了。
 */
if (app.isPackaged) process.env.FILE_TRANSFER_LOGS_DIR = app.getPath('logs')
