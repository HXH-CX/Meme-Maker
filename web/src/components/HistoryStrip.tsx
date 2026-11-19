import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HistoryEntry, MemeSource } from '../types'
import { clearHistory, loadHistory, removeFromHistory } from '../lib/history'

export default function HistoryStrip() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory())

  if (!entries.length) return null

  const reopen = (entry: HistoryEntry) => {
    const source: MemeSource = { kind: 'upload', dataUrl: entry.base }
    navigate('/editor', { state: { source, layers: entry.layers } })
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-gray-500">最近作品（仅存于本浏览器）</h2>
        <button
          onClick={() => {
            clearHistory()
            setEntries([])
          }}
          className="text-xs text-gray-400 underline hover:text-red-500"
        >
          清空
        </button>
      </div>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {entries.map((entry) => (
          <div key={entry.id} className="relative shrink-0">
            <button
              onClick={() => reopen(entry)}
              title="重新编辑"
              className="block overflow-hidden rounded-lg bg-white shadow-sm transition hover:shadow-md"
            >
              <img src={entry.base} alt="最近作品" className="h-20 w-20 object-cover" />
            </button>
            <button
              onClick={() => {
                removeFromHistory(entry.id)
                setEntries(loadHistory())
              }}
              aria-label="删除该作品"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-xs text-white hover:bg-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}