import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MemeSource } from '../types'
import { fetchAiStatus, pollVariations, proxiedImageUrl, startVariations } from '../lib/api'
import { makeScaledDataUrl } from '../lib/history'
import { readAsDataUrl, validateImageFile } from '../lib/upload'
import { useEffect } from 'react'

interface Result {
  dimension: string
  url: string
  message?: string
}

export default function VariationsPanel() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [refImage, setRefImage] = useState<HTMLImageElement | null>(null)
  const [refPreview, setRefPreview] = useState('')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    fetchAiStatus().then(setEnabled)
  }, [])

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    const invalid = validateImageFile(file)
    if (invalid) {
      setError(invalid)
      return
    }
    const img = new Image()
    img.onload = () => {
      setRefImage(img)
      setRefPreview(makeScaledDataUrl(img, 256))
      setError('')
      setResults([])
    }
    img.onerror = () => setError('图片读取失败，请重试')
    img.src = await readAsDataUrl(file)
  }

  const generate = async () => {
    if (!refImage) {
      setError('请先上传参考图')
      return
    }
    setLoading(true)
    setError('')
    setResults([])
    try {
      const tasks = await startVariations(makeScaledDataUrl(refImage, 1024), prompt.trim())
      const settled = await pollVariations(tasks)
      setResults(
        settled.map(({ dimension, result }) => ({
          dimension,
          url: result.imageUrl ? proxiedImageUrl(result.imageUrl) : '',
          message: result.message,
        })),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const enterEditor = (url: string) => {
    const source: MemeSource = { kind: 'ai', imageUrl: url, prompt: `变体：${prompt}` }
    navigate('/editor', { state: { source } })
  }

  if (enabled === null) return null

  return (
    <section className="mt-6 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm text-gray-500">AI 形象变体（一次 3 张：风格 / 动作 / 表情）</h2>
      {!enabled ? (
        <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
          AI 功能未启用：配置 server/.env 中的 DASHSCOPE_API_KEY 后重启即可使用
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            隐私告知：参考图将发送至阿里云通义万相用于生成（服务端内存转发、不落盘）；"上传图片加字"流程仍纯本地处理。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-amber-300 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100"
            >
              {refPreview ? '更换参考图' : '＋ 上传参考图'}
            </button>
            {refPreview && (
              <img src={refPreview} alt="参考图" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          <textarea
            value={prompt}
            maxLength={200}
            rows={2}
            placeholder="补充要求（可留空），如：戴墨镜、举着奶茶"
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button
            onClick={generate}
            disabled={loading}
            className="self-end rounded-xl bg-amber-500 px-5 py-1.5 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? '生成中…' : '生成 3 张变体'}
          </button>
          {loading && <p className="text-sm text-gray-500">3 路并行生成中，预计 10~30 秒…</p>}
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
              <button onClick={generate} className="ml-3 underline">
                重试
              </button>
            </div>
          )}
          {results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {results.map((r) => (
                <div key={r.dimension} className="rounded-lg bg-gray-50 p-2 text-center">
                  <div className="text-xs text-gray-500">{r.dimension}变体</div>
                  {r.url ? (
                    <>
                      <img src={r.url} alt={`${r.dimension}变体`} className="mt-1 w-full rounded-lg object-cover" />
                      <button
                        onClick={() => enterEditor(r.url)}
                        className="mt-2 rounded-lg bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"
                      >
                        加字
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-red-600">{r.message ?? '生成失败'}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}