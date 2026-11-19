const BASE = 'https://dashscope.aliyuncs.com/api/v1'
const MODEL = 'wanx2.1-t2i-turbo'
const TIMEOUT_MS = 15000

function headers(key: string, async = false): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  if (async) h['X-DashScope-Async'] = 'enable'
  return h
}

export interface DashScopeTask {
  status: 'pending' | 'succeeded' | 'failed'
  imageUrl?: string
  code?: string
  message?: string
}

export async function submitTask(key: string, prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/services/aigc/text2image/image-synthesis`, {
    method: 'POST',
    headers: headers(key, true),
    body: JSON.stringify({
      model: MODEL,
      input: { prompt },
      parameters: { size: '1024*1024', n: 1 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await res.json()) as {
    output?: { task_id?: string }
    code?: string
    message?: string
  }
  if (!res.ok || !data.output?.task_id) {
    throw Object.assign(new Error(data.message ?? '提交生成任务失败'), {
      code: data.code ?? 'SubmitFailed',
    })
  }
  return data.output.task_id
}

export async function getTask(key: string, taskId: string): Promise<DashScopeTask> {
  const res = await fetch(`${BASE}/tasks/${taskId}`, {
    headers: headers(key),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = (await res.json()) as {
    output?: {
      task_status?: string
      results?: { url?: string }[]
      code?: string
      message?: string
    }
    code?: string
    message?: string
  }
  const out = data.output
  if (!res.ok || !out) {
    return { status: 'failed', code: data.code ?? 'QueryFailed', message: data.message }
  }
  if (out.task_status === 'SUCCEEDED') {
    const url = out.results?.[0]?.url
    return url ? { status: 'succeeded', imageUrl: url } : { status: 'failed', code: 'NoResult' }
  }
  if (out.task_status === 'FAILED' || out.task_status === 'UNKNOWN') {
    return { status: 'failed', code: out.code ?? data.code, message: out.message ?? data.message }
  }
  return { status: 'pending' }
}

export function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.aliyuncs.com')
  } catch {
    return false
  }
}

export async function fetchImage(url: string): Promise<{ type: string; buffer: Buffer }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error('图片下载失败')
  return {
    type: res.headers.get('content-type') ?? 'image/png',
    buffer: Buffer.from(await res.arrayBuffer()),
  }
}