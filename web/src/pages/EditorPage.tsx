import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { MemeSource, TextLayer } from '../types'
import { TEXT_COLORS } from '../types'
import { drawMeme } from '../lib/render'
import { canCopyImage, copyCanvas, downloadCanvas } from '../lib/export'
import TextControls from '../components/TextControls'

function sourceUrl(source: MemeSource): string {
  switch (source.kind) {
    case 'template':
      return source.template.file
    case 'upload':
      return source.dataUrl
    case 'ai':
      return source.imageUrl
  }
}

const initialLayers: TextLayer[] = [
  { text: '', position: 'top', size: 'm', color: TEXT_COLORS[0] },
  { text: '', position: 'bottom', size: 'm', color: TEXT_COLORS[1] },
]

export default function EditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const source = (location.state as { source?: MemeSource } | null)?.source

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageError, setImageError] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [layers, setLayers] = useState<TextLayer[]>(initialLayers)
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.fonts.load('16px "ZCOOL KuaiLe"').then(() => setFontsReady(true))
  }, [])

  useEffect(() => {
    if (!source) return
    const img = new Image()
    img.onload = () => setImage(img)
    img.onerror = () => setImageError(true)
    img.src = sourceUrl(source)
  }, [source])

  useEffect(() => {
    if (image && fontsReady && canvasRef.current) {
      drawMeme(canvasRef.current, image, layers)
    }
  }, [image, fontsReady, layers])

  if (!source) return <Navigate to="/" replace />

  const updateLayer = (index: number, layer: TextLayer) => {
    setLayers((prev) => prev.map((l, i) => (i === index ? layer : l)))
  }

  const handleCopy = async () => {
    if (!canvasRef.current) return
    try {
      await copyCanvas(canvasRef.current)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      await downloadCanvas(canvasRef.current)
      setNotice('当前浏览器不支持复制，已改为下载')
      setTimeout(() => setNotice(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="flex items-center gap-3 border-b-4 border-amber-300 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-amber-100"
        >
          ← 返回
        </button>
        <h1 className="text-lg text-amber-600">编辑表情包</h1>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <div className="flex flex-1 items-start justify-center">
          {imageError ? (
            <p className="py-16 text-gray-500">底图加载失败，请返回重试</p>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full max-w-md rounded-xl bg-white shadow-md"
            />
          )}
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-80">
          <TextControls label="顶部文字" layer={layers[0]} onChange={(l) => updateLayer(0, l)} />
          <TextControls label="底部文字" layer={layers[1]} onChange={(l) => updateLayer(1, l)} />

          <div className="flex gap-3">
            <button
              onClick={() => canvasRef.current && downloadCanvas(canvasRef.current)}
              disabled={!image}
              className="flex-1 rounded-xl bg-amber-500 py-2.5 text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              下载 PNG
            </button>
            {canCopyImage() && (
              <button
                onClick={handleCopy}
                disabled={!image}
                className="flex-1 rounded-xl bg-white py-2.5 text-amber-600 shadow-sm transition hover:bg-amber-100 disabled:opacity-50"
              >
                {copied ? '已复制 ✓' : '复制图片'}
              </button>
            )}
          </div>
          {notice && <p className="text-center text-sm text-amber-700">{notice}</p>}
        </div>
      </main>
    </div>
  )
}