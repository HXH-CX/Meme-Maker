import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AiStyle, MemeSource } from '../types'
import { fetchAiStatus, pollGeneration, proxiedImageUrl, startGeneration } from '../lib/api'

type Phase = 'idle' | 'loading' | 'done' | 'error'

export default function AiPanel() {
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<AiStyle>('meme')
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [resultUrl, setResultUrl] = useState('')

  useEffect(() => {
    fetchAiStatus().then(setEnabled)
  }, [])

  const generate = async () => {
    if (!prompt.trim()) {
      setMessage('请输入描述词')
      setPhase('error')
      return
    }
    setPhase('loading')
    setMessage('')
    try {
      const taskId = await startGeneration(prompt.trim(), style)
      const task = await pollGeneration(taskId)
      if (task.status === 'succeeded' && task.imageUrl) {
        setResultUrl(proxiedImageUrl(task.imageUrl))
        setPhase('done')
      } else {
        setMessage(task.message ?? '生成失败，请重试')
        setPhase('error')
      }
    } catch (e) {
      setMessage((e as Error).message)
      setPhase('error')
    }
  }

  const enterEditor = () => {
    const source: MemeSource = { kind: 'ai', imageUrl: resultUrl, prompt }
    navigate('/editor', { state: { source } })
  }

  if (enabled === null) return null

  return (
    <section className="mt-6 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm text-gray-500">AI 生成底图（通义万相）</h2>
      {!enabled ? (
        <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
          AI 功能未启用：配置 server/.env 中的 DASHSCOPE_API_KEY 后重启即可使用，其余功能不受影响
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          <textarea
            value={prompt}
            maxLength={200}
            rows={2}
            placeholder="描述想要的底图，如：一只戴墨镜的橘猫"
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { value: 'meme', label: '斗图漫画风' },
                { value: 'sticker', label: '可爱贴纸风' },
              ] as { value: AiStyle; label: string }[]
            ).map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  style === s.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-amber-100'
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={generate}
              disabled={phase === 'loading'}
              className="ml-auto rounded-xl bg-amber-500 px-5 py-1.5 text-sm text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {phase === 'loading' ? '生成中…' : '生成底图'}
            </button>
          </div>

          {phase === 'loading' && (
            <p className="text-sm text-gray-500">AI 正在绘制，预计 5~20 秒…</p>
          )}
          {phase === 'error' && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
              <button onClick={generate} className="ml-3 underline">
                重试
              </button>
            </div>
          )}
          {phase === 'done' && (
            <div className="flex flex-wrap items-center gap-3">
              <img src={resultUrl} alt="AI 生成底图" className="h-32 w-32 rounded-lg object-cover" />
              <button
                onClick={enterEditor}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
              >
                加字进入编辑器
              </button>
              <button
                onClick={generate}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-amber-100"
              >
                换一张
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}