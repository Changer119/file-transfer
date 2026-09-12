import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { classifyFileKind } from '@shared/fileKind'
import type { DeviceClient } from './deviceClient'
import { logger } from '../logger'

/**
 * 视频缩略图的大小上限（issue #13 真机验证）：手机录的视频，MP4 的 moov
 * 索引大多在文件末尾（边录边写，只有录完才知道完整索引），adb 走的是
 * USB 顺序传输通道，不像本地磁盘那样能直接跳到文件末尾读一小段索引——
 * 想拿到一帧画面就得先把整个文件传完。实测一个 600MB 的视频要等 40 秒，
 * 而 100MB 上下大约 6~7 秒，作为个人工具能接受的等待上限。超过这个大小
 * 的视频直接放弃生成真实缩略图，UI 用通用视频图标顶上。
 */
export const MAX_VIDEO_THUMBNAIL_SOURCE_BYTES = 100 * 1024 * 1024

/**
 * 缩略图（issue #10）：图片直接把原图字节透传给渲染进程，由浏览器端 CSS
 * 缩放显示；视频用 ffmpeg 抽一帧当缩略图。任何失败（读取失败、ffmpeg 缺失
 * 或抽帧失败）都吞掉返回 undefined——缩略图只是锦上添花，不该让文件列表
 * 因为某一个文件读取失败而整体报错。
 */
export async function generateThumbnail(
  client: DeviceClient,
  path: string,
  sizeBytes: number
): Promise<Buffer | undefined> {
  const kind = classifyFileKind(path)
  if (kind === 'other') return undefined
  if (kind === 'video') {
    if (sizeBytes > MAX_VIDEO_THUMBNAIL_SOURCE_BYTES) return undefined
    return runQueuedVideoThumbnail(client, path)
  }

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
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`))
    })
  })
}
