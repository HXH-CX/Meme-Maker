export type AiStyle = 'meme' | 'sticker'

export const STYLE_PREFIX: Record<AiStyle, string> = {
  meme: '黑白暴走漫画风格，粗线条，夸张搞笑表情，表情包底图，画面无文字：',
  sticker: '可爱贴纸风格，粗描边，扁平配色，柔和纯色背景，画面无文字：',
}

export const MAX_PROMPT_LENGTH = 200

export const VARIATION_DIMENSIONS = ['风格', '动作', '表情'] as const

export const VARIATION_PRESETS: Record<(typeof VARIATION_DIMENSIONS)[number], string> = {
  风格: '把这张图的画风改成另一种截然不同的风格（如黑白暴走漫画、像素风、粗描边贴纸），保持主体形象不变',
  动作: '让图中主体换一个更夸张搞笑的动作姿势，保持形象与画风不变',
  表情: '让图中主体换一个更夸张搞笑的面部表情，保持形象、姿势与画风不变',
}

const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
export const MAX_IMAGE_DATA_URL_LENGTH = 6_000_000

export function validateVariationBody(
  body: unknown,
): { image: string; prompt: string } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: '请求格式错误' }
  const { image, prompt } = body as { image?: unknown; prompt?: unknown }
  if (typeof image !== 'string' || !IMAGE_DATA_URL_RE.test(image))
    return { error: '参考图格式错误（仅 PNG/JPG/WebP）' }
  if (image.length > MAX_IMAGE_DATA_URL_LENGTH) return { error: '参考图过大，请换一张较小的图' }
  if (prompt !== undefined && (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_LENGTH))
    return { error: `描述词不能超过 ${MAX_PROMPT_LENGTH} 字` }
  return { image, prompt: typeof prompt === 'string' ? prompt.trim() : '' }
}

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