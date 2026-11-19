import { describe, expect, it } from 'vitest'
import { MAX_ENTRIES, trimHistory } from './history'
import type { HistoryEntry } from '../types'

const entry = (n: number): HistoryEntry => ({
  id: String(n),
  savedAt: n,
  base: 'data:image/jpeg;base64,x',
  layers: [],
})

describe('trimHistory', () => {
  it('按时间倒序保留最新 12 条', () => {
    const entries = Array.from({ length: 20 }, (_, i) => entry(i))
    const r = trimHistory(entries)
    expect(r).toHaveLength(MAX_ENTRIES)
    expect(r[0].id).toBe('19')
    expect(r[MAX_ENTRIES - 1].id).toBe('8')
  })

  it('不足上限时全保留且排序', () => {
    const r = trimHistory([entry(1), entry(3), entry(2)])
    expect(r.map((e) => e.id)).toEqual(['3', '2', '1'])
  })

  it('空列表返回空', () => {
    expect(trimHistory([])).toEqual([])
  })
})