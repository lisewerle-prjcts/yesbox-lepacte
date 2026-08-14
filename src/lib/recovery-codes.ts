import { randomInt, createHash } from 'crypto'

export function generateRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I/O/0/1 pour éviter la confusion
  let code = ''
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += '-'
    code += chars[randomInt(chars.length)]
  }
  return code
}

export function hashRecoveryCode(code: string) {
  return createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex')
}
