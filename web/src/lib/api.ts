import type { AiStyle } from '../types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'

export interface GenerateTask {
  status: 'pending' | 'succeeded' | 'failed'
  imageUrl?: string
  message?: string
}

export async function fetchAiStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/status`)
    if (!res.ok) return false
    const data = (await res.json()) as { aiEnabled?: boolean }
    return !!data.aiEnabled
  } catch {
    return false
  }
}

export async function startGeneration(prompt: string, style: AiStyle): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
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
    const res = await fetch(`${BASE}/generate/${taskId}`)
    const data = (await res.json()) as GenerateTask
    if (!res.ok) throw new Error(data.message ?? '查询生成状态失败')
    if (data.status !== 'pending') return data
  }
  throw new Error('生成超时，请重试')
}

export interface VariationTask {
  taskId: string
  dimension: string
}

export async function startVariations(image: string, prompt: string): Promise<VariationTask[]> {
  const res = await fetch(`${BASE}/variations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, prompt }),
  })
  const data = (await res.json()) as { tasks?: VariationTask[]; message?: string }
  if (!res.ok || !data.tasks) throw new Error(data.message ?? '提交变体任务失败')
  return data.tasks
}

export async function pollVariations(
  tasks: VariationTask[],
  timeoutMs = 90_000,
): Promise<{ dimension: string; result: GenerateTask }[]> {
  const deadline = Date.now() + timeoutMs
  const pending = new Map(tasks.map((t) => [t.taskId, t]))
  const done: { dimension: string; result: GenerateTask }[] = []
  while (pending.size && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000))
    for (const [taskId, task] of [...pending]) {
      const res = await fetch(`${BASE}/generate/${taskId}`)
      const data = (await res.json()) as GenerateTask
      if (!res.ok) throw new Error(data.message ?? '查询生成状态失败')
      if (data.status !== 'pending') {
        pending.delete(taskId)
        done.push({ dimension: task.dimension, result: data })
      }
    }
  }
  if (pending.size) throw new Error('生成超时，请重试')
  return done
}

export function proxiedImageUrl(url: string): string {
  return `${BASE}/image-proxy?url=${encodeURIComponent(url)}`
}