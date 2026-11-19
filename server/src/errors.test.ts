import { describe, expect, it } from 'vitest'
import { failCode, isThrottling, withRetry } from './errors'

describe('failCode', () => {
  it('审核拒绝与限流给中文文案', () => {
    expect(failCode('DataInspectionFailed', 'x')).toMatch(/审核/)
    expect(failCode('Throttling.RateQuota', 'Requests rate limit exceeded')).toMatch(/频率/)
    expect(failCode(undefined, 'Requests rate limit exceeded, see https://help.aliyun.com/x')).toMatch(/频率/)
  })

  it('未知错误去除链接后展示', () => {
    expect(failCode('X', 'boom https://a.b/c')).toBe('boom')
    expect(failCode('X', 'https://a.b/c')).toBe('生成失败，请重试')
    expect(failCode(undefined, undefined)).toBe('生成失败，请重试')
  })
})

describe('withRetry', () => {
  it('限流错误退避重试后成功', async () => {
    let n = 0
    const r = await withRetry(async () => {
      n++
      if (n < 3) throw Object.assign(new Error('rate limit'), { code: 'Throttling' })
      return 'ok'
    }, 3, 1)
    expect(r).toBe('ok')
    expect(n).toBe(3)
  })

  it('非限流错误不重试', async () => {
    let n = 0
    await expect(
      withRetry(async () => {
        n++
        throw new Error('boom')
      }, 3, 1),
    ).rejects.toThrow('boom')
    expect(n).toBe(1)
  })

  it('重试耗尽抛出最后一次错误', async () => {
    let n = 0
    await expect(
      withRetry(async () => {
        n++
        throw Object.assign(new Error('rate limit'), { code: 'Throttling' })
      }, 2, 1),
    ).rejects.toThrow('rate limit')
    expect(n).toBe(2)
  })
})

describe('isThrottling', () => {
  it('识别码前缀与消息关键词', () => {
    expect(isThrottling({ code: 'Throttling.RateQuota' })).toBe(true)
    expect(isThrottling({ message: 'Requests rate limit exceeded' })).toBe(true)
    expect(isThrottling({ code: 'Other', message: 'boom' })).toBe(false)
  })
})