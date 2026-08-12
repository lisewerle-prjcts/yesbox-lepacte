'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { randomInt } from 'crypto'
import nodemailer from 'nodemailer'
import { normalizeOverrides, emptyOverrides, type ModuleContentOverrides, type QuestionOverride } from '@/lib/modules-effective'
import type { QuestionType } from '@/types'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Accès refusé')
  return supabase
}

function getMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

function mailHtml(body: string) {
  return `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;background:#fbf8f3;border-radius:16px;overflow:hidden;">
    <div style="background:#c5256e;padding:24px 32px;"><p style="color:white;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 4px;">YES BOX — Le Pacte</p></div>
    <div style="padding:32px;color:#1a1816;font-size:15px;line-height:1.7;">${body}</div>
    <div style="background:#1a1816;padding:16px 32px;text-align:center;"><p style="font-family:monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin:0;">YES BOX · yesbox-lepacte.fr</p></div>
  </div>`
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) pwd += chars[randomInt(chars.length)]
  return pwd
}

const SLUGS = ['moi','toi','nous','communication','conflits','engagement','renouvellement']

export async function adminUnlockModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', slug)
  revalidatePath('/admin/couples')
  revalidatePath('/admin/actions')
  return { success: true }
}

export async function adminLockModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  await supabase.from('modules').update({ statut: 'locked', revealed: false, connivence_score: null, revealed_at: null }).eq('couple_id', coupleId).eq('slug', slug)
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminRevealModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  await supabase.from('modules').update({ revealed: true, revealed_at: new Date().toISOString() }).eq('couple_id', coupleId).eq('slug', slug)
  // Déverrouille le suivant
  const idx = SLUGS.indexOf(slug)
  if (idx >= 0 && idx < SLUGS.length - 1) {
    await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', SLUGS[idx + 1])
  }
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminResetModule(coupleId: string, slug: string) {
  const supabase = await assertAdmin()
  const { data: mod } = await supabase.from('modules').select('id').eq('couple_id', coupleId).eq('slug', slug).single()
  if (mod) {
    await supabase.from('reponses').delete().eq('module_id', mod.id)
    await supabase.from('modules').update({ statut: 'en_cours', revealed: false, connivence_score: null, revealed_at: null, completed_at: null }).eq('id', mod.id)
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

function revalidateModuleContent(moduleSlug: string) {
  revalidatePath('/admin/contenu')
  revalidatePath(`/module/${moduleSlug}`)
  revalidatePath(`/module/${moduleSlug}/revelation`)
  revalidatePath('/pacte')
  revalidatePath('/admin/voir-en-tant-que')
}

async function readModuleOverrides(supabase: Awaited<ReturnType<typeof createClient>>, moduleSlug: string): Promise<ModuleContentOverrides> {
  const key = `module_questions_override::${moduleSlug}`
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  if (!data?.value) return emptyOverrides()
  try {
    return normalizeOverrides(JSON.parse(data.value))
  } catch {
    return emptyOverrides()
  }
}

async function writeModuleOverrides(supabase: Awaited<ReturnType<typeof createClient>>, moduleSlug: string, overrides: ModuleContentOverrides) {
  const key = `module_questions_override::${moduleSlug}`
  await supabase.from('settings').upsert({ key, value: JSON.stringify(overrides) }, { onConflict: 'key' })
}

export async function adminSaveQuestionOverride(moduleSlug: string, questionSlug: string, fields: QuestionOverride) {
  const supabase = await assertAdmin()
  const current = await readModuleOverrides(supabase, moduleSlug)
  current.overrides[questionSlug] = fields
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

export async function adminResetQuestionOverride(moduleSlug: string, questionSlug: string) {
  const supabase = await assertAdmin()
  const current = await readModuleOverrides(supabase, moduleSlug)
  delete current.overrides[questionSlug]
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

export async function adminRemoveQuestion(moduleSlug: string, questionSlug: string) {
  const supabase = await assertAdmin()
  const current = await readModuleOverrides(supabase, moduleSlug)
  if (!current.hidden.includes(questionSlug)) current.hidden.push(questionSlug)
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

export async function adminRestoreQuestion(moduleSlug: string, questionSlug: string) {
  const supabase = await assertAdmin()
  const current = await readModuleOverrides(supabase, moduleSlug)
  current.hidden = current.hidden.filter(s => s !== questionSlug)
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

interface NewQuestionInput {
  type: QuestionType
  texte: string
  hint?: string
  options?: string[]
  min?: number
  max?: number
  labelMin?: string
  labelMax?: string
}

export async function adminAddQuestion(moduleSlug: string, input: NewQuestionInput) {
  const supabase = await assertAdmin()
  if (!input.texte.trim()) return { error: 'Le texte de la question est requis' }
  const current = await readModuleOverrides(supabase, moduleSlug)
  const slug = `custom_${Math.random().toString(36).slice(2, 8)}`
  current.custom.push({ slug, ...input, texte: input.texte.trim() })
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true, slug }
}

export async function adminUpdateCustomQuestion(moduleSlug: string, questionSlug: string, input: NewQuestionInput) {
  const supabase = await assertAdmin()
  const current = await readModuleOverrides(supabase, moduleSlug)
  const idx = current.custom.findIndex(q => q.slug === questionSlug)
  if (idx === -1) return { error: 'Question introuvable' }
  current.custom[idx] = { ...current.custom[idx], ...input }
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

export async function adminRemoveCustomQuestion(moduleSlug: string, questionSlug: string) {
  const supabase = await assertAdmin()
  const current = await readModuleOverrides(supabase, moduleSlug)
  current.custom = current.custom.filter(q => q.slug !== questionSlug)
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

export async function adminAssignMemberToCouple(userId: string, coupleId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('couple_id', coupleId)
  if ((count ?? 0) >= 2) return { error: 'Ce couple a déjà deux membres.' }

  const { error } = await admin
    .from('profiles')
    .update({ couple_id: coupleId, role: (count ?? 0) === 0 ? 'initiateur' : 'partenaire' })
    .eq('id', userId)
  if (error) return { error: error.message }

  await admin.rpc('initialiser_modules_couple', { p_couple_id: coupleId })

  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
  return { success: true }
}

export async function adminUnassignMember(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ couple_id: null, role: null }).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
  return { success: true }
}

export async function adminCreateEmptyCouple() {
  await assertAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin.from('couples').insert({}).select('id, numero').single()
  if (error) return { error: error.message }
  revalidatePath('/admin/securite')
  return { success: true, coupleId: data.id, numero: data.numero }
}

interface PrecommandeEditableFields {
  prenom?: string | null
  nom?: string | null
  email?: string | null
  adresse?: string | null
  partenaire_prenom?: string | null
  message?: string | null
}

export async function adminUpdatePrecommande(id: string, fields: PrecommandeEditableFields) {
  await assertAdmin()
  const admin = createAdminClient()

  const update: PrecommandeEditableFields = {}
  if (fields.prenom !== undefined) update.prenom = fields.prenom?.trim() || ''
  if (fields.nom !== undefined) update.nom = fields.nom?.trim() || ''
  if (fields.email !== undefined) update.email = fields.email?.trim() || ''
  if (fields.adresse !== undefined) update.adresse = fields.adresse?.trim() || null
  if (fields.partenaire_prenom !== undefined) update.partenaire_prenom = fields.partenaire_prenom?.trim() || null
  if (fields.message !== undefined) update.message = fields.message?.trim() || null

  if (update.prenom === '') return { error: 'Le prénom est requis' }
  if (update.nom === '') return { error: 'Le nom est requis' }
  if (update.email === '' || (update.email && !update.email.includes('@'))) return { error: 'Email invalide' }

  const { error } = await admin.from('precommandes').update(update).eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: 'Cet email est déjà utilisé par une autre inscription' }
    return { error: error.message }
  }

  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminSetCoupleCode(id: string, code: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const cleanCode = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{5}$/.test(cleanCode)) return { error: 'Le code doit contenir 5 lettres/chiffres' }

  const { error } = await admin.from('precommandes').update({ couple_code: cleanCode }).eq('id', id)
  if (error) {
    if (error.code === '23505') return { error: 'Ce code est déjà utilisé par une autre inscription' }
    return { error: error.message }
  }

  revalidatePath('/admin/couples')
  return { success: true, code: cleanCode }
}

export async function adminRegenerateCoupleCode(id: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('generate_precommande_code')
  if (error) return { error: error.message }

  const { error: updateError } = await admin.from('precommandes').update({ couple_code: data }).eq('id', id)
  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/couples')
  return { success: true, code: data as string }
}

export async function adminPairPrecommandes(idA: string, idB: string) {
  await assertAdmin()
  if (idA === idB) return { error: 'Sélectionne deux inscriptions différentes' }
  const admin = createAdminClient()

  const { error: errorA } = await admin.from('precommandes').update({ paired_with: idB }).eq('id', idA)
  if (errorA) return { error: errorA.message }
  const { error: errorB } = await admin.from('precommandes').update({ paired_with: idA }).eq('id', idB)
  if (errorB) return { error: errorB.message }

  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminUnpairPrecommande(id: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: row } = await admin.from('precommandes').select('paired_with').eq('id', id).single()
  await admin.from('precommandes').update({ paired_with: null }).eq('id', id)
  if (row?.paired_with) {
    await admin.from('precommandes').update({ paired_with: null }).eq('id', row.paired_with)
  }

  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminDeletePrecommande(id: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: row } = await admin.from('precommandes').select('paired_with').eq('id', id).single()
  if (row?.paired_with) {
    await admin.from('precommandes').update({ paired_with: null }).eq('id', row.paired_with)
  }

  const { error } = await admin.from('precommandes').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminResetAndSendPassword(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const newPassword = generateTempPassword()
  const { data, error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { error: error.message }

  const email = data.user?.email
  const { data: profile } = await admin.from('profiles').select('prenom').eq('id', userId).single()
  if (!email) return { error: 'Email introuvable pour ce membre' }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return { success: true, password: newPassword, emailed: false }
  }

  const transporter = getMailTransporter()
  await transporter.sendMail({
    from: `"YES BOX" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Ton nouveau mot de passe YES BOX',
    html: mailHtml(`
      <p>Bonjour ${profile?.prenom || ''},</p>
      <p>Voici ton nouveau mot de passe pour te connecter à ton espace YES BOX — Le Pacte :</p>
      <p style="font-family:monospace;font-size:20px;font-weight:700;background:#f7d9e6;color:#c5256e;padding:12px 20px;border-radius:10px;display:inline-block;letter-spacing:.05em;">${newPassword}</p>
      <p>Connecte-toi puis change-le si tu le souhaites depuis ton espace.</p>
    `),
  })

  return { success: true, password: newPassword, emailed: true }
}
