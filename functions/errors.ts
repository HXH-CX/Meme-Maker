export function failCode(code: string | undefined, message: string | undefined): string {
  if (code === 'DataInspectionFailed') return '内容未通过安全审核，请换一句描述'
  if (code?.startsWith('Throttling') || /rate limit|quota/i.test(message ?? ''))
    return '生成请求超出厂商频率或额度限制，请稍后重试'
  const clean = (message ?? '').replace(/https?:\/\/\S+/g, '').trim()
  return clean || '生成失败，请重试'
}

export function isThrottling(err: { code?: string; message?: string }): boolean {
  return !!err.code?.startsWith('Throttling') || /rate limit/i.test(err.message ?? '')
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 2000,
): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (!isThrottling(e as { code?: string; message?: string }) || i === attempts - 1) throw e
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)))
    }
  }
  throw last
}