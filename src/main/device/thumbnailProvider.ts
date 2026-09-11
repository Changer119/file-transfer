import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { classifyFileKind } from '@shared/fileKind'
import type { DeviceClient } from './deviceClient'
import { logger } from '../logger'

/**
 * 缩略图（issue #10）：图片直接把原图字节透传给渲染进程，由浏览器端 CSS
 * 缩放显示；视频用 ffmpeg 抽一帧当缩略图。任何失败（读取失败、ffmpeg 缺失
 * 或抽帧失败）都吞掉返回 undefined——缩略图只是锦上添花，不该让文件列表
 * 因为某一个文件读取失败而整体报错。
 */
export async function generateThumbnail(client: DeviceClient, path: string): Promise<Buffer | undefined> {
  const kind = classifyFileKind(path)
  if (kind === 'other') return undefined
  if (kind === 'video') return runQueuedVideoThumbnail(client, path)

  try {
    return await client.readFileBytes(path)
  } catch (error) {
    logger.warn({ path, error }, 'generateThumbnail: readFileBytes failed')
    return undefined
  }
}

// 一个视频缩略图要先把整个视频下载下来再交给 ffmpeg 抽帧（见 extractVideoFrame
// 的注释），比图片重得多。串成一条队列，同一时刻最多只有一个视频在下载/抽帧，
// 避免滚动到一屏都是视频的文件夹时，adb 和内存同时被好几个大文件占满。
// 图片走原图直通，不受这条队列影响。
let videoThumbnailQueue: Promise<unknown> = Promise.resolve()

function runQueuedVideoThumbnail(client: DeviceClient, path: string): Promise<Buffer | undefined> {
  const task = () => generateVideoThumbnail(client, path)
  const result = videoThumbnailQueue.then(task, task)
  videoThumbnailQueue = result.catch(() => undefined)
  return result
}

async function generateVideoThumbnail(client: DeviceClient, path: string): Promise<Buffer | undefined> {
  let sourceBytes: Buffer
  try {
    sourceBytes = await client.readFileBytes(path)
  } catch (error) {
    logger.warn({ path, error }, 'generateThumbnail: readFileBytes failed')
    return undefined
  }
  return extractVideoFrame(path, sourceBytes)
}

async function extractVideoFrame(path: string, videoBytes: Buffer): Promise<Buffer | undefined> {
  const dir = await mkdtemp(join(tmpdir(), 'file-transfer-thumb-'))
  const videoPath = join(dir, 'source')
  const framePath = join(dir, 'frame.jpg')
  try {
    await writeFile(videoPath, videoBytes)
    await runFfmpeg(['-y', '-ss', '00:00:00.5', '-i', videoPath, '-frames:v', '1', framePath])
    return await readFile(framePath)
  } catch (error) {
    logger.warn({ path, error }, 'generateThumbnail: ffmpeg frame extraction failed')
    return undefined
  } finally {
    // rm 整个临时目录，而不是逐个 unlink 里面的文件——mkdtemp 建的目录本身
    // 也要清理掉，否则每抽一次帧就留一个空目录在系统临时目录下。
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('ffmpeg', args)
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`ffmpeg exited with code ${code}`))))
  })
}
