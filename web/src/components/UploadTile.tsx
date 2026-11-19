import { useRef } from 'react'
import { ACCEPTED_TYPES, readAsDataUrl, validateImageFile } from '../lib/upload'

interface Props {
  onLoaded: (dataUrl: string) => void
  onError: (message: string) => void
}

export default function UploadTile({ onLoaded, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    const error = validateImageFile(file)
    if (error) {
      onError(error)
      return
    }
    try {
      onLoaded(await readAsDataUrl(file))
    } catch {
      onError('图片读取失败，请重试')
    }
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-2 border-dashed border-amber-300 bg-white px-4 py-3 text-sm text-amber-700 transition hover:border-amber-400 hover:bg-amber-100"
      >
        ＋ 上传图片加字（JPG / PNG / WebP，≤10MB，图片不会离开你的浏览器）
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}