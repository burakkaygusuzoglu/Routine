import { describe, expect, it } from 'vitest'
import { isIosSafari } from './installHint'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

describe('isIosSafari', () => {
  it('detects iPhone Safari', () => expect(isIosSafari(IPHONE_SAFARI)).toBe(true))
  it('rejects iOS Chrome', () => expect(isIosSafari(IPHONE_CHROME)).toBe(false))
  it('rejects desktop Safari', () => expect(isIosSafari(MAC_SAFARI, 0)).toBe(false))
  it('detects iPadOS posing as Mac', () => expect(isIosSafari(MAC_SAFARI, 5)).toBe(true))
})
