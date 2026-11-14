import { describe, expect, it } from 'vitest'
import { alertText, isValidEmail } from './messages'

describe('auth messages', () => {
  it('validates email shape', () => {
    expect(isValidEmail('burak@example.com')).toBe(true)
    expect(isValidEmail(' burak@example.com ')).toBe(true)
    expect(isValidEmail('burak@')).toBe(false)
    expect(isValidEmail('burak example.com')).toBe(false)
  })
  it('translates known alert codes and falls back to the server text', () => {
    expect(alertText({ type: 'error', messageCode: 'INVALID_OTP', message: 'x', messageParams: {} })).toMatch(/Kod hatalı/)
    expect(alertText({ type: 'error', messageCode: 'GENERIC_ERROR', message: 'Server says no', messageParams: {} })).toBe('Server says no')
  })
})
