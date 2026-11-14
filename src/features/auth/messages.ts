import type { DXCAlert } from 'dexie-cloud-addon'

/** Turkish text for the sign-in service's alert codes. */
export function alertText(alert: DXCAlert): string {
  switch (alert.messageCode) {
    case 'INVALID_OTP':
      return 'Kod hatalı ya da süresi dolmuş. Tekrar dene ya da yeni kod iste.'
    case 'INVALID_EMAIL':
      return 'Bu e-posta adresi geçerli görünmüyor.'
    case 'OTP_SENT':
      return 'Kodu e-postana gönderdik. Gelmediyse gereksiz klasörüne bak.'
    case 'LICENSE_LIMIT_REACHED':
    case 'NO_SEATS_AVAILABLE':
      return 'Routine şu an yeni hesap kabul etmiyor.'
    case 'USER_NOT_REGISTERED':
    case 'USER_NOT_ACCEPTED':
      return 'Bu e-posta ile giriş izni yok.'
    case 'USER_DEACTIVATED':
      return 'Bu hesap devre dışı bırakılmış.'
    case 'LOGOUT_CONFIRMATION':
      return 'Henüz eşitlenmemiş değişiklikler var. Çıkış yaparsan bu cihazdaki son değişiklikler kaybolur.'
    default:
      return alert.message
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}
