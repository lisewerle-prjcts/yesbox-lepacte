'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ADMIN_VIEW_AS_COOKIE } from '@/lib/effective-session'
import nodemailer from 'nodemailer'

// Vérifie l'admin via la session réelle (cookies), puis renvoie le client
// service role : les couples gérés par l'admin ne sont pas les siens, donc
// il faut contourner les RLS scoping "mon propre couple" pour lire/écrire.
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Accès refusé')
  return admin
}

const SLUGS = ['partenaire1','partenaire2','couple','quotidien','projets','famille','communication','disputes','cdd','bac']

// Les actions admin opèrent sur le cycle 1 (le parcours initial) de chaque module.
export async function adminUnlockModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', slug).eq('cycle', 1)
  revalidatePath('/admin/couples')
  revalidatePath('/admin/actions')
  return { success: true }
}

export async function adminLockModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  const { data: mod } = await supabase.from('modules').select('id').eq('couple_id', coupleId).eq('slug', slug).eq('cycle', 1).single()
  if (mod) await supabase.from('scores').delete().eq('module_id', mod.id)
  await supabase.from('modules').update({ statut: 'locked', revealed: false, revealed_at: null }).eq('couple_id', coupleId).eq('slug', slug).eq('cycle', 1)
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminRevealModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  await supabase.from('modules').update({ revealed: true, revealed_at: new Date().toISOString() }).eq('couple_id', coupleId).eq('slug', slug).eq('cycle', 1)
  // Déverrouille le suivant
  const idx = SLUGS.indexOf(slug)
  if (idx >= 0 && idx < SLUGS.length - 1) {
    await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', SLUGS[idx + 1]).eq('cycle', 1)
  }
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminResetModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  const { data: mod } = await supabase.from('modules').select('id').eq('couple_id', coupleId).eq('slug', slug).eq('cycle', 1).single()
  if (mod) {
    await supabase.from('reponses').delete().eq('module_id', mod.id)
    await supabase.from('scores').delete().eq('module_id', mod.id)
    await supabase.from('modules').update({ statut: 'en_cours', revealed: false, revealed_at: null, completed_at: null }).eq('id', mod.id)
  }
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminSendEmail(to: string, subject: string, body: string) {
  await assertAdmin()
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return { error: 'GMAIL non configuré' }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
  await transporter.sendMail({
    from: `"YES BOX" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
      <div style="background:#c5256e;padding:24px 32px;"><p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p></div>
      <div style="padding:32px;color:#1a1816;font-size:15px;line-height:1.7;">${body.replace(/\n/g, '<br/>')}</div>
      <div style="background:#1a1816;padding:16px 32px;text-align:center;"><p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin:0;">YES BOX · yesbox-lepacte.fr</p></div>
    </div>`,
  })
  return { success: true }
}

export async function adminSaveMessage(key: string, value: string) {
  const supabase = await assertAdmin()
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' })
  revalidatePath('/admin/messages')
  return { success: true }
}

// ============================================================
// Configuration d'un espace couple depuis l'admin : nom du couple et
// prénom de chaque membre.
// ============================================================
export async function adminUpdateCoupleInfo(formData: FormData) {
  const supabase = await assertAdmin()
  const coupleId = formData.get('couple_id') as string
  if (!coupleId) return { error: 'Couple introuvable' }

  const nomCouple = (formData.get('nom_couple') as string || '').trim()
  await supabase.from('couples').update({ nom_couple: nomCouple || null }).eq('id', coupleId)

  for (const [key, value] of Array.from(formData.entries())) {
    if (!key.startsWith('prenom_')) continue
    const profileId = key.slice('prenom_'.length)
    const prenom = (value as string).trim()
    if (prenom.length >= 2) await supabase.from('profiles').update({ prenom }).eq('id', profileId)
  }

  revalidatePath('/admin/couples')
  return { success: true }
}

// ============================================================
// Mode « voir / tester en tant que » — un admin peut se mettre à la place
// d'un membre d'un couple pour vérifier son parcours, y compris répondre
// aux questions à sa place.
// ============================================================

export async function adminViewAs(profileId: string) {
  await assertAdmin()
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_VIEW_AS_COOKIE, profileId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 4, // 4h
  })
  redirect('/tableau-de-bord')
}

export async function adminStopViewAs() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_VIEW_AS_COOKIE)
  redirect('/admin/couples')
}
