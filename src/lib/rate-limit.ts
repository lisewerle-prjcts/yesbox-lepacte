import { createAdminClient } from '@/lib/supabase/server'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export async function checkLoginLock(email: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('login_attempts').select('locked_until').eq('email', email.toLowerCase()).single()
  if (data?.locked_until && new Date(data.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(data.locked_until).getTime() - Date.now()) / 60000)
    return { locked: true as const, minutesLeft }
  }
  return { locked: false as const }
}

export async function registerFailedLogin(email: string) {
  const admin = createAdminClient()
  const key = email.toLowerCase()
  const { data } = await admin.from('login_attempts').select('attempts').eq('email', key).single()
  const attempts = (data?.attempts ?? 0) + 1

  if (attempts >= MAX_ATTEMPTS) {
    await admin.from('login_attempts').upsert({
      email: key, attempts: 0,
      locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString(),
      updated_at: new Date().toISOString(),
    })
  } else {
    await admin.from('login_attempts').upsert({ email: key, attempts, locked_until: null, updated_at: new Date().toISOString() })
  }
}

export async function clearLoginAttempts(email: string) {
  const admin = createAdminClient()
  await admin.from('login_attempts').delete().eq('email', email.toLowerCase())
}
