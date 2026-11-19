export interface TextLayout {
  lines: string[]
  fontSize: number
  lineHeight: number
}

export type MeasureFn = (text: string, fontSize: number) => number

const TOKEN_RE = /[⺀-鿿豈-﫿＀-￯　-〿]|[^\s⺀-鿿豈-﫿＀-￯　-〿]+|\s+/g

function tokenize(text: string): string[] {
  return text.match(TOKEN_RE) ?? []
}

function wrapLines(
  tokens: string[],
  maxWidth: number,
  fontSize: number,
  measure: MeasureFn,
): string[] {
  const lines: string[] = []
  let line = ''
  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      if (line) line += ' '
      continue
    }
    const candidate = line + token
    if (line && measure(candidate, fontSize) > maxWidth) {
      lines.push(line.trimEnd())
      line = token
    } else {
      line = candidate
    }
    while (measure(line, fontSize) > maxWidth && line.length > 1) {
      let cut = line.length - 1
      while (cut > 1 && measure(line.slice(0, cut), fontSize) > maxWidth) cut--
      lines.push(line.slice(0, cut))
      line = line.slice(cut)
    }
  }
  if (line.trim()) lines.push(line.trimEnd())
  return lines
}

export function layoutText(
  measure: MeasureFn,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startFontSize: number,
  minFontSize = 12,
): TextLayout {
  const tokens = tokenize(text.trim())
  let fontSize = startFontSize
  let lines: string[] = []
  let lineHeight = fontSize * 1.25
  while (true) {
    lineHeight = fontSize * 1.25
    lines = wrapLines(tokens, maxWidth, fontSize, measure)
    if (lines.length * lineHeight <= maxHeight || fontSize <= minFontSize) break
    fontSize = Math.max(minFontSize, fontSize * 0.9)
  }
  return { lines, fontSize, lineHeight }
}