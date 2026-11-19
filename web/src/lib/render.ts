import type { TextLayer, TextSize } from '../types'
import { layoutText } from './textLayout'

export const FONT_FAMILY = '"ZCOOL KuaiLe", "PingFang SC", "Microsoft YaHei", sans-serif'
export const SHORT_SIDE = 512

const SIZE_RATIO: Record<TextSize, number> = { s: 0.06, m: 0.09, l: 0.13 }

export function computeCanvasSize(imgW: number, imgH: number, shortSide = SHORT_SIDE) {
  const scale = shortSide / Math.min(imgW, imgH)
  return { width: Math.round(imgW * scale), height: Math.round(imgH * scale) }
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function drawMeme(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  layers: TextLayer[],
) {
  const { width, height } = computeCanvasSize(image.naturalWidth, image.naturalHeight)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, width, height)

  const pad = width * 0.04
  const regionHeight = height * 0.3
  const maxWidth = width - pad * 2

  for (const layer of layers) {
    if (!layer.text.trim()) continue
    const startFontSize = height * SIZE_RATIO[layer.size]
    const layout = layoutText(
      (text, fontSize) => {
        ctx.font = `${fontSize}px ${FONT_FAMILY}`
        return ctx.measureText(text).width
      },
      layer.text,
      maxWidth,
      regionHeight,
      startFontSize,
    )
    if (!layout.lines.length) continue

    ctx.font = `${layout.fontSize}px ${FONT_FAMILY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, layout.fontSize / 8)
    ctx.strokeStyle = luminance(layer.color) > 0.6 ? '#000000' : '#ffffff'
    ctx.fillStyle = layer.color

    const blockHeight = layout.lines.length * layout.lineHeight
    const blockTop =
      layer.position === 'top' ? pad : height - pad - blockHeight
    layout.lines.forEach((line, i) => {
      const y = blockTop + layout.lineHeight * (i + 0.5)
      ctx.strokeText(line, width / 2, y)
      ctx.fillText(line, width / 2, y)
    })
  }
}