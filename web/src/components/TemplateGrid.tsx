import { useState } from 'react'
import type { Template } from '../types'

interface Props {
  templates: Template[]
  onSelect: (template: Template) => void
}

function TemplateCard({ template, onSelect }: { template: Template; onSelect: Props['onSelect'] }) {
  const [failed, setFailed] = useState(false)
  return (
    <button
      onClick={() => onSelect(template)}
      className="group overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      title={template.name}
    >
      {failed ? (
        <div className="flex aspect-square items-center justify-center bg-gray-100 text-xs text-gray-400">
          加载失败
        </div>
      ) : (
        <img
          src={template.file}
          alt={template.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="aspect-square w-full object-cover"
        />
      )}
      <div className="px-2 py-1.5 text-center text-sm text-gray-700 group-hover:text-amber-600">
        {template.name}
      </div>
    </button>
  )
}

export default function TemplateGrid({ templates, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} onSelect={onSelect} />
      ))}
    </div>
  )
}