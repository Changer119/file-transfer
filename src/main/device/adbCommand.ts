import { spawn } from 'node:child_process'
import { AdbNotFoundError } from './deviceClient'

export function runAdb(args: string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('adb', args)
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') reject(new AdbNotFoundError())
      else reject(error)
    })

    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout)
      else reject(new Error(`adb ${args.join(' ')} exited with code ${code}: ${stderr}`))
    })
  })
}
