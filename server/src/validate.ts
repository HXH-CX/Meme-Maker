export type AiStyle = 'meme' | 'sticker'

export const STYLE_PREFIX: Record<AiStyle, string> = {
  meme: '黑白暴走漫画风格，粗线条，夸张搞笑表情，表情包底图，画面无文字：',
  sticker: '可爱贴纸风格，粗描边，扁平配色，柔和纯色背景，画面无文字：',
}

export const MAX_PROMPT_LENGTH = 200

export function validateGenerateBody(
  body: unknown,
): { prompt: string; style: AiStyle } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: '请求格式错误' }
  const { prompt, style } = body as { prompt?: unknown; style?: unknown }
  if (typeof prompt !== 'string' || !prompt.trim()) return { error: '请输入描述词' }
  if (prompt.length > MAX_PROMPT_LENGTH) return { error: `描述词不能超过 ${MAX_PROMPT_LENGTH} 字` }
  if (style !== 'meme' && style !== 'sticker') return { error: '风格参数错误' }
  return { prompt: prompt.trim(), style }
}