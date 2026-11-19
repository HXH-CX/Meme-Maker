import {
  fetchImage,
  getTask,
  isAllowedImageUrl,
  submitEditTask,
  submitTask,
  envGet,
} from './dashscope.ts'
import { failCode, withRetry } from './errors.ts'
import {
  STYLE_PREFIX,
  validateGenerateBody,
  validateVariationBody,
  VARIATION_DIMENSIONS,
  VARIATION_PRESETS,
} from './validate.ts'

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const hits = new Map<string, number[]>()

function key(): string {
  return envGet('DASHSCOPE_API_KEY') ?? ''
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

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

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

async function readBody(req: Request, maxChars: number): Promise<unknown | { error: string }> {
  const text = await req.text()
  if (text.length > maxChars) return { error: '请求体过大' }
  try {
    return JSON.parse(text)
  } catch {
    return { error: '请求格式错误' }
  }
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const m = url.pathname.match(/\/(status|generate|variations|image-proxy)(?:\/([A-Za-z0-9-]{8,64}))?\/?$/)
  if (!m) return json(404, { code: 'NOT_FOUND', message: '接口不存在' })
  const route = m[1]
  const taskId = m[2]

  if (route === 'status') {
    if (req.method !== 'GET') return json(405, { code: 'METHOD_NOT_ALLOWED', message: '方法不允许' })
    return json(200, { aiEnabled: key().length > 0 })
  }

  if (!key()) return json(503, { code: 'AI_DISABLED', message: 'AI 功能未启用' })

  if (route === 'generate') {
    if (req.method === 'GET' && taskId) {
      try {
        const task = await getTask(key(), taskId)
        if (task.status === 'failed') {
          return json(200, { status: 'failed', message: failCode(task.code, task.message) })
        }
        return json(200, task)
      } catch {
        return json(502, { status: 'failed', message: '查询生成状态失败，请重试' })
      }
    }
    if (req.method !== 'POST' || taskId) {
      return json(405, { code: 'METHOD_NOT_ALLOWED', message: '方法不允许' })
    }
    if (rateLimited(clientIp(req))) {
      return json(429, { code: 'RATE_LIMITED', message: '请求过频，请一分钟后再试' })
    }
    const body = await readBody(req, 16_000)
    if (typeof body === 'object' && body !== null && 'error' in body) {
      return json(400, { code: 'BAD_REQUEST', message: (body as { error: string }).error })
    }
    const parsed = validateGenerateBody(body)
    if ('error' in parsed) return json(400, { code: 'BAD_REQUEST', message: parsed.error })
    try {
      const id = await withRetry(() => submitTask(key(), STYLE_PREFIX[parsed.style] + parsed.prompt))
      return json(202, { taskId: id })
    } catch (e) {
      const err = e as { code?: string; message?: string }
      return json(502, { code: err.code ?? 'SUBMIT_FAILED', message: failCode(err.code, err.message) })
    }
  }

  if (route === 'variations') {
    if (req.method !== 'POST') return json(405, { code: 'METHOD_NOT_ALLOWED', message: '方法不允许' })
    if (rateLimited(clientIp(req))) {
      return json(429, { code: 'RATE_LIMITED', message: '请求过频，请一分钟后再试' })
    }
    const body = await readBody(req, 8_000_000)
    if (typeof body === 'object' && body !== null && 'error' in body) {
      return json(400, { code: 'BAD_REQUEST', message: (body as { error: string }).error })
    }
    const parsed = validateVariationBody(body)
    if ('error' in parsed) return json(400, { code: 'BAD_REQUEST', message: parsed.error })
    try {
      const tasks: { taskId: string; dimension: string }[] = []
      for (const dim of VARIATION_DIMENSIONS) {
        const id = await withRetry(() =>
          submitEditTask(
            key(),
            parsed.image,
            VARIATION_PRESETS[dim] + (parsed.prompt ? `；补充要求：${parsed.prompt}` : ''),
          ),
        )
        tasks.push({ taskId: id, dimension: dim })
        await new Promise((r) => setTimeout(r, 1200))
      }
      return json(202, { tasks })
    } catch (e) {
      const err = e as { code?: string; message?: string }
      return json(502, { code: err.code ?? 'SUBMIT_FAILED', message: failCode(err.code, err.message) })
    }
  }

  if (route === 'image-proxy') {
    if (req.method !== 'GET') return json(405, { code: 'METHOD_NOT_ALLOWED', message: '方法不允许' })
    const target = url.searchParams.get('url') ?? ''
    if (!isAllowedImageUrl(target)) {
      return json(400, { code: 'BAD_REQUEST', message: '图片地址不在白名单内' })
    }
    try {
      const { type, buffer } = await fetchImage(target)
      return new Response(buffer, { headers: { 'content-type': type } })
    } catch {
      return json(502, { code: 'IMAGE_FETCH_FAILED', message: '图片下载失败，请重试' })
    }
  }

  return json(404, { code: 'NOT_FOUND', message: '接口不存在' })
}