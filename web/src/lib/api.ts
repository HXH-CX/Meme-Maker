import type { AiStyle } from '../types'

export interface GenerateTask {
  status: 'pending' | 'succeeded' | 'failed'
  imageUrl?: string
  message?: string
}

export async function fetchAiStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/status')
    if (!res.ok) return false
    const data = (await res.json()) as { aiEnabled?: boolean }
    return !!data.aiEnabled
  } catch {
    return false
  }
}

export async function startGeneration(prompt: string, style: AiStyle): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style }),
  })
  const data = (await res.json()) as { taskId?: string; message?: string }
  if (!res.ok || !data.taskId) throw new Error(data.message ?? '提交生成任务失败')
  return data.taskId
}

export async function pollGeneration(taskId: string, timeoutMs = 60_000): Promise<GenerateTask> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    const res = await fetch(`/api/generate/${taskId}`)
    const data = (await res.json()) as GenerateTask
    if (!res.ok) throw new Error(data.message ?? '查询生成状态失败')
    if (data.status !== 'pending') return data
  }
  throw new Error('生成超时，请重试')
}

export function proxiedImageUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}