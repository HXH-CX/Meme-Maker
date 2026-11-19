export type TemplateCategory = '斗图经典' | '可爱贴纸' | '动物' | '情绪'

export interface Template {
  id: string
  name: string
  file: string
  category: TemplateCategory
  tags: string[]
  credit: string
}

export type TextPosition = 'top' | 'bottom'
export type TextSize = 's' | 'm' | 'l'

export interface TextLayer {
  text: string
  position: TextPosition
  size: TextSize
  color: string
}

export type MemeSource =
  | { kind: 'template'; template: Template }
  | { kind: 'upload'; dataUrl: string }
  | { kind: 'ai'; imageUrl: string; prompt: string }

export const TEXT_COLORS = [
  '#1a1a1a',
  '#ffffff',
  '#e53935',
  '#fdd835',
  '#1e88e5',
  '#43a047',
  '#ec407a',
  '#8e24aa',
]

export const CATEGORIES: TemplateCategory[] = ['斗图经典', '可爱贴纸', '动物', '情绪']