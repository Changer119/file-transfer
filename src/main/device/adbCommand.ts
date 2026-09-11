import { spawn } from 'node:child_process'
import { AdbNotFoundError } from './deviceClient'

export function runAdb(args: string[]): Promise<string> {
  return runAdbBinary(args).then((buffer) => buffer.toString('utf8'))
}

/**
 * 缩略图（issue #10）：`runAdb` 把 stdout 当文本 utf8 解码，会破坏二进制内容
 * （比如 `exec-out cat` 拉取的图片/视频字节），所以单独留一份按 Buffer 收集、
 * 不做任何编码转换的版本。
 */
export function runAdbBinary(args: string[]): Promise<Buffer> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('adb', args)
    const stdoutChunks: Buffer[] = []
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') reject(new AdbNotFoundError())
      else reject(error)
    })

    child.on('close', (code) => {
      if (code === 0) resolvePromise(Buffer.concat(stdoutChunks))
      else reject(new Error(`adb ${args.join(' ')} exited with code ${code}: ${stderr}`))
    })
  })
}
