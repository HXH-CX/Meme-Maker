import { describe, expect, it } from 'vitest'
import { MAX_PROMPT_LENGTH, validateGenerateBody, validateVariationBody } from './validate'

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

describe('validateVariationBody', () => {
  const img = 'data:image/png;base64,aGVsbG8='

  it('接受合法参考图与可选描述', () => {
    expect(validateVariationBody({ image: img })).toEqual({ image: img, prompt: '' })
    expect(validateVariationBody({ image: img, prompt: '戴墨镜' })).toEqual({
      image: img,
      prompt: '戴墨镜',
    })
  })

  it('拒绝非法图片格式与超大图', () => {
    expect(validateVariationBody({ image: 'data:image/gif;base64,xxx' })).toHaveProperty('error')
    expect(validateVariationBody({ image: 'https://x.com/a.png' })).toHaveProperty('error')
    expect(validateVariationBody({ image: `data:image/png;base64,${'A'.repeat(6_000_001)}` })).toHaveProperty('error')
  })

  it('拒绝超长描述', () => {
    expect(
      validateVariationBody({ image: img, prompt: '字'.repeat(MAX_PROMPT_LENGTH + 1) }),
    ).toHaveProperty('error')
  })
})