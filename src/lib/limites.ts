import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'

// Limites d'actions publiques (inscription, renvoi de l'e-mail de
// confirmation) : empêche de faire partir des e-mails en boucle depuis notre
// adresse ou de créer des comptes en masse. Table limites_actions (une ligne
// par action, purgée chaque nuit) ; si elle manque encore en base, rien
// n'est bloqué.

export interface Regle { max: number; minutes: number }

export async function adresseIp(): Promise<string> {
  const h = await headers()
  return h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'inconnue'
}

// true si l'action dépasse une des règles ; sinon l'action est comptée.
export async function limiteDepassee(cle: string, regles: Regle[]): Promise<boolean> {
  const admin = createAdminClient()
  const fenetre = Math.max(...regles.map(r => r.minutes))
  const depuis = new Date(Date.now() - fenetre * 60_000).toISOString()
  const { data, error } = await admin.from('limites_actions').select('cree_le').eq('cle', cle).gte('cree_le', depuis)
  if (error) {
    console.error(`[limites] ${error.message}`)
    return false
  }
  const maintenant = Date.now()
  for (const r of regles) {
    const n = (data ?? []).filter(l => maintenant - new Date(l.cree_le).getTime() < r.minutes * 60_000).length
    if (n >= r.max) return true
  }
  await admin.from('limites_actions').insert({ cle })
  return false
}

export async function purgerLimites(): Promise<void> {
  const admin = createAdminClient()
  await admin.from('limites_actions').delete().lt('cree_le', new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString())
}

// Case anti-robot Cloudflare Turnstile. Sans TURNSTILE_SECRET_KEY (pas
// encore configurée), la vérification est ignorée.
export async function verifierAntiRobot(jeton: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!jeton) return false
  try {
    const corps = new URLSearchParams({ secret, response: jeton })
    const ip = await adresseIp()
    if (ip !== 'inconnue') corps.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: corps, signal: AbortSignal.timeout(8000) })
    const resultat = await res.json() as { success?: boolean }
    return !!resultat.success
  } catch (e) {
    // Cloudflare injoignable : on laisse passer plutôt que bloquer toutes les
    // inscriptions (les limites par adresse IP restent actives).
    console.error(`[anti-robot] ${e instanceof Error ? e.message : String(e)}`)
    return true
  }
}
