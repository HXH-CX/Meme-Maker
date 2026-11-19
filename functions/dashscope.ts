const MODEL_T2I = 'wanx2.1-t2i-turbo'
const MODEL_EDIT = 'wanx2.1-imageedit'
const TIMEOUT_MS = 15_000

type EnvGlobal = { Deno?: { env: { get(k: string): string | undefined } } }

export function envGet(k: string): string | undefined {
  const d = (globalThis as EnvGlobal).Deno
  if (d) return d.env.get(k)
  return typeof process !== 'undefined' ? process.env[k] : undefined
}

export function baseUrl(): string {
  return envGet('DASHSCOPE_BASE_URL') ?? 'https://dashscope.aliyuncs.com/api/v1'
}

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

async function submit(
  key: string,
  path: string,
  body: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: headers(key, true),
    body: JSON.stringify(body),
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

export function submitTask(key: string, prompt: string): Promise<string> {
  return submit(key, '/services/aigc/text2image/image-synthesis', {
    model: MODEL_T2I,
    input: { prompt },
    parameters: { size: '1024*1024', n: 1 },
  })
}

export function submitEditTask(
  key: string,
  imageDataUrl: string,
  instruction: string,
): Promise<string> {
  return submit(key, '/services/aigc/image2image/image-synthesis', {
    model: MODEL_EDIT,
    input: { function: 'description_edit', base_image_url: imageDataUrl, prompt: instruction },
    parameters: { n: 1 },
  })
}

export async function getTask(key: string, taskId: string): Promise<DashScopeTask> {
  const res = await fetch(`${baseUrl()}/tasks/${taskId}`, {
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

export async function fetchImage(url: string): Promise<{ type: string; buffer: Uint8Array }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error('图片下载失败')
  return {
    type: res.headers.get('content-type') ?? 'image/png',
    buffer: new Uint8Array(await res.arrayBuffer()),
  }
}