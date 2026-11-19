import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MemeSource, Template, TemplateCategory } from '../types'
import { CATEGORIES } from '../types'
import TemplateGrid from '../components/TemplateGrid'

export default function HomePage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadError, setLoadError] = useState(false)
  const [category, setCategory] = useState<TemplateCategory | '全部'>('全部')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    fetch('/templates/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then(setTemplates)
      .catch(() => setLoadError(true))
  }, [])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return templates.filter((t) => {
      if (category !== '全部' && t.category !== category) return false
      if (!kw) return true
      return (
        t.name.toLowerCase().includes(kw) ||
        t.tags.some((tag) => tag.toLowerCase().includes(kw))
      )
    })
  }, [templates, category, keyword])

  const openEditor = (template: Template) => {
    const source: MemeSource = { kind: 'template', template }
    navigate('/editor', { state: { source } })
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b-4 border-amber-300 px-4 py-5 text-center">
        <h1 className="text-3xl text-amber-600">Meme Maker</h1>
        <p className="mt-1 text-sm text-gray-500">选个底图，加句话，斗图快人一步</p>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['全部', ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  category === c
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-amber-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索模板…"
            className="rounded-full border border-amber-200 bg-white px-4 py-1.5 text-sm outline-none focus:border-amber-400 sm:w-52"
          />
        </div>

        <div className="mt-6">
          {loadError ? (
            <p className="py-16 text-center text-gray-500">模板加载失败，请刷新重试</p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-gray-500">没有找到匹配的模板</p>
          ) : (
            <TemplateGrid templates={filtered} onSelect={openEditor} />
          )}
        </div>
      </main>
    </div>
  )
}