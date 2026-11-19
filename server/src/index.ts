import 'dotenv/config'
import express from 'express'
import { fetchImage, getTask, isAllowedImageUrl, submitEditTask, submitTask } from './dashscope'
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

function failCode(code: string | undefined, message: string | undefined): string {
  if (code === 'DataInspectionFailed') return '内容未通过安全审核，请换一句描述'
  if (code === 'Throttling' || code === 'AllocationQuotaExceeded')
    return '生成额度不足或请求过频，请稍后再试'
  return message ?? '生成失败，请重试'
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
    const taskId = await submitTask(KEY, STYLE_PREFIX[parsed.style] + parsed.prompt)
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
    const taskIds = await Promise.all(
      VARIATION_DIMENSIONS.map((dim) =>
        submitEditTask(
          KEY,
          parsed.image,
          VARIATION_PRESETS[dim] + (parsed.prompt ? `；补充要求：${parsed.prompt}` : ''),
        ),
      ),
    )
    res.status(202).json({ tasks: taskIds.map((id, i) => ({ taskId: id, dimension: VARIATION_DIMENSIONS[i] })) })
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