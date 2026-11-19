import 'dotenv/config'
import express from 'express'
import { fetchImage, getTask, isAllowedImageUrl, submitEditTask, submitTask } from './dashscope'
import { failCode, withRetry } from './errors'
import { STYLE_PREFIX, validateGenerateBody, validateVariationBody, VARIATION_DIMENSIONS, VARIATION_PRESETS } from './validate'

const app = express()
app.use('/api/variations', express.json({ limit: '8mb' }))
app.use(express.json({ limit: '16kb' }))

const KEY = process.env.DASHSCOPE_API_KEY ?? ''
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list)
    return true
  }
  list.push(now)
  hits.set(ip, list)
  return false
}

app.get('/api/status', (_req, res) => {
  res.json({ aiEnabled: KEY.length > 0 })
})

app.post('/api/generate', async (req, res) => {
  if (!KEY) {
    res.status(503).json({ code: 'AI_DISABLED', message: 'AI 功能未启用' })
    return
  }
  if (rateLimited(req.ip ?? 'unknown')) {
    res.status(429).json({ code: 'RATE_LIMITED', message: '请求过频，请一分钟后再试' })
    return
  }
  const parsed = validateGenerateBody(req.body)
  if ('error' in parsed) {
    res.status(400).json({ code: 'BAD_REQUEST', message: parsed.error })
    return
  }
  try {
    const taskId = await withRetry(() => submitTask(KEY, STYLE_PREFIX[parsed.style] + parsed.prompt))
    res.status(202).json({ taskId })
  } catch (e) {
    const err = e as { code?: string; message?: string }
    res.status(502).json({ code: err.code ?? 'SUBMIT_FAILED', message: failCode(err.code, err.message) })
  }
})

app.post('/api/variations', async (req, res) => {
  if (!KEY) {
    res.status(503).json({ code: 'AI_DISABLED', message: 'AI 功能未启用' })
    return
  }
  if (rateLimited(req.ip ?? 'unknown')) {
    res.status(429).json({ code: 'RATE_LIMITED', message: '请求过频，请一分钟后再试' })
    return
  }
  const parsed = validateVariationBody(req.body)
  if ('error' in parsed) {
    res.status(400).json({ code: 'BAD_REQUEST', message: parsed.error })
    return
  }
  try {
    const tasks: { taskId: string; dimension: string }[] = []
    for (const dim of VARIATION_DIMENSIONS) {
      const taskId = await withRetry(() =>
        submitEditTask(
          KEY,
          parsed.image,
          VARIATION_PRESETS[dim] + (parsed.prompt ? `；补充要求：${parsed.prompt}` : ''),
        ),
      )
      tasks.push({ taskId, dimension: dim })
      // 间隔提交，避免瞬时并发触发厂商 QPS 限流
      await new Promise((r) => setTimeout(r, 1200))
    }
    res.status(202).json({ tasks })
  } catch (e) {
    const err = e as { code?: string; message?: string }
    res.status(502).json({ code: err.code ?? 'SUBMIT_FAILED', message: failCode(err.code, err.message) })
  }
})

app.get('/api/generate/:taskId', async (req, res) => {
  if (!KEY) {
    res.status(503).json({ code: 'AI_DISABLED', message: 'AI 功能未启用' })
    return
  }
  const taskId = req.params.taskId
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(taskId)) {
    res.status(400).json({ code: 'BAD_REQUEST', message: '任务 ID 格式错误' })
    return
  }
  try {
    const task = await getTask(KEY, taskId)
    if (task.status === 'failed') {
      res.json({ status: 'failed', message: failCode(task.code, task.message) })
      return
    }
    res.json(task)
  } catch {
    res.status(502).json({ status: 'failed', message: '查询生成状态失败，请重试' })
  }
})

app.get('/api/image-proxy', async (req, res) => {
  const url = typeof req.query.url === 'string' ? req.query.url : ''
  if (!isAllowedImageUrl(url)) {
    res.status(400).json({ code: 'BAD_REQUEST', message: '图片地址不在白名单内' })
    return
  }
  try {
    const { type, buffer } = await fetchImage(url)
    res.type(type).send(buffer)
  } catch {
    res.status(502).json({ code: 'IMAGE_FETCH_FAILED', message: '图片下载失败，请重试' })
  }
})

app.listen(3001, () => {
  console.log(`server on :3001, ai ${KEY ? 'enabled' : 'disabled'}`)
})