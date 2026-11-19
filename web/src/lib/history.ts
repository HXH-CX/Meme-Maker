import type { HistoryEntry, TextLayer } from '../types'

const KEY = 'meme-maker-history'
export const MAX_ENTRIES = 12

export function trimHistory(entries: HistoryEntry[], max = MAX_ENTRIES): HistoryEntry[] {
  return [...entries].sort((a, b) => b.savedAt - a.savedAt).slice(0, max)
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? trimHistory(parsed) : []
  } catch {
    return []
  }
}

function persist(entries: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function saveToHistory(base: string, layers: TextLayer[]) {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
    base,
    layers,
  }
  let entries = trimHistory([entry, ...loadHistory()])
  try {
    persist(entries)
  } catch {
    entries = entries.slice(0, Math.max(1, entries.length - 3))
    try {
      persist(entries)
    } catch {
      // 存储不可用（隐私模式等）时静默放弃历史功能
    }
  }
}

export function removeFromHistory(id: string) {
  persist(loadHistory().filter((e) => e.id !== id))
}

export function clearHistory() {
  localStorage.removeItem(KEY)
}

export function makeScaledDataUrl(image: HTMLImageElement, shortSide: number): string {
  const scale = shortSide / Math.min(image.naturalWidth, image.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function makeBaseDataUrl(image: HTMLImageElement): string {
  return makeScaledDataUrl(image, 512)
}