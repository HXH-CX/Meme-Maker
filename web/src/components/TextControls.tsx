import type { TextLayer, TextSize } from '../types'
import { TEXT_COLORS } from '../types'

interface Props {
  label: string
  layer: TextLayer
  onChange: (layer: TextLayer) => void
}

const SIZES: { value: TextSize; label: string }[] = [
  { value: 's', label: '小' },
  { value: 'm', label: '中' },
  { value: 'l', label: '大' },
]

export default function TextControls({ label, layer, onChange }: Props) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm text-gray-500">{label}</h3>
      <textarea
        value={layer.text}
        maxLength={100}
        rows={2}
        placeholder="输入文字（可留空）"
        onChange={(e) => onChange({ ...layer, text: e.target.value })}
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-1">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => onChange({ ...layer, size: s.value })}
              className={`rounded-lg px-3 py-1 text-sm ${
                layer.size === s.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-amber-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {TEXT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ ...layer, color })}
              aria-label={`颜色 ${color}`}
              style={{ backgroundColor: color }}
              className={`h-6 w-6 rounded-full border border-gray-300 ${
                layer.color === color ? 'ring-2 ring-amber-500 ring-offset-1' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}