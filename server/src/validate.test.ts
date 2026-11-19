import { describe, expect, it } from 'vitest'
import { MAX_PROMPT_LENGTH, validateGenerateBody } from './validate'

describe('validateGenerateBody', () => {
  it('接受合法白名单参数', () => {
    expect(validateGenerateBody({ prompt: '一只猫', style: 'meme' })).toEqual({
      prompt: '一只猫',
      style: 'meme',
    })
  })

  it('拒绝空描述与超长描述', () => {
    expect(validateGenerateBody({ prompt: '  ', style: 'meme' })).toHaveProperty('error')
    expect(
      validateGenerateBody({ prompt: '字'.repeat(MAX_PROMPT_LENGTH + 1), style: 'meme' }),
    ).toHaveProperty('error')
  })

  it('拒绝非法风格与多余字段透传', () => {
    expect(validateGenerateBody({ prompt: '猫', style: 'xxx' })).toHaveProperty('error')
    const r = validateGenerateBody({ prompt: '猫', style: 'sticker', model: 'evil' })
    expect(r).toEqual({ prompt: '猫', style: 'sticker' })
  })

  it('拒绝非对象请求体', () => {
    expect(validateGenerateBody(null)).toHaveProperty('error')
    expect(validateGenerateBody('cat')).toHaveProperty('error')
  })
})