import { describe, expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, validateImageFile } from './upload'

describe('validateImageFile', () => {
  it('接受 JPG/PNG/WebP', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateImageFile({ type, size: 1024 })).toBeNull()
    }
  })

  it('拒绝非法格式', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1024 })).toMatch(/格式/)
    expect(validateImageFile({ type: 'application/pdf', size: 1024 })).toMatch(/格式/)
    expect(validateImageFile({ type: '', size: 1024 })).toMatch(/格式/)
  })

  it('拒绝超过 10MB', () => {
    expect(validateImageFile({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toMatch(/10MB/)
  })

  it('恰好 10MB 允许', () => {
    expect(validateImageFile({ type: 'image/png', size: MAX_UPLOAD_BYTES })).toBeNull()
  })
})