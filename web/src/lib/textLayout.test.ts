import { describe, expect, it } from 'vitest'
import { layoutText, type MeasureFn } from './textLayout'

// 近似测量：每字符 0.6em
const measure: MeasureFn = (text, fontSize) => text.length * fontSize * 0.6

describe('layoutText', () => {
  it('短文字单行且不缩字号', () => {
    const r = layoutText(measure, '你好', 400, 150, 48)
    expect(r.lines).toEqual(['你好'])
    expect(r.fontSize).toBe(48)
  })

  it('长中文按宽度换行', () => {
    const r = layoutText(measure, '今天天气真的非常不错啊', 120, 300, 40)
    expect(r.lines.length).toBeGreaterThan(1)
    for (const line of r.lines) {
      expect(measure(line, r.fontSize)).toBeLessThanOrEqual(120)
    }
  })

  it('高度不够时自动缩字号', () => {
    const r = layoutText(measure, '这是一段特别特别长的文字需要缩小才能放下', 200, 60, 48)
    expect(r.fontSize).toBeLessThan(48)
    expect(r.lines.length * r.lineHeight).toBeLessThanOrEqual(60)
  })

  it('超长英文单词强制断行', () => {
    const r = layoutText(measure, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 100, 300, 40)
    expect(r.lines.length).toBeGreaterThan(1)
    for (const line of r.lines) {
      expect(measure(line, r.fontSize)).toBeLessThanOrEqual(100)
    }
  })

  it('英文按词换行不拆散单词', () => {
    const r = layoutText(measure, 'hello world foo bar', 150, 300, 30)
    expect(r.lines.join(' ')).toBe('hello world foo bar')
    expect(r.lines).not.toContain('worl')
  })

  it('空文字返回空行', () => {
    const r = layoutText(measure, '   ', 400, 150, 48)
    expect(r.lines).toEqual([])
  })

  it('缩到最小字号仍超高时兜底返回', () => {
    const r = layoutText(measure, '字'.repeat(200), 50, 20, 48, 12)
    expect(r.fontSize).toBe(12)
    expect(r.lines.length).toBeGreaterThan(0)
  })
})