'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { createClient } from '@/lib/supabase/server'
import { randomInt } from 'crypto'
import nodemailer from 'nodemailer'
import { normalizeOverrides, emptyOverrides, getEffectiveModules, type ModuleContentOverrides, type QuestionOverride } from '@/lib/modules-effective'
import { SITE_CONTENT_PREFIX } from '@/lib/site-content'
import { assertAdmin, getMailTransporter, mailHtml } from '@/lib/admin-mail'
import { sendWelcomeEmail } from '@/lib/welcome-email'
import { MODULES } from '@/lib/modules-data'
import type { QuestionType, Question } from '@/types'

function revalidateModuleLists() {
  revalidatePath('/admin/contenu')
  revalidatePath('/admin/couples')
  revalidatePath('/admin/actions')
  revalidatePath('/', 'layout')
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) pwd += chars[randomInt(chars.length)]
  return pwd
}

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
  const ordre = (await getEffectiveModules()).map(m => m.slug)
  const idx = ordre.indexOf(slug)
  if (idx >= 0 && idx < ordre.length - 1) {
    await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', ordre[idx + 1])
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
    from: '"YES BOX" <lise.yesbox@gmail.com>',
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

// Mode édition en ligne : textes & boutons du site marketing et des espaces couples.
export async function adminSaveSiteContent(contentKey: string, value: string) {
  const supabase = await assertAdmin()
  await supabase.from('settings').upsert(
    { key: `${SITE_CONTENT_PREFIX}${contentKey}`, value },
    { onConflict: 'key' }
  )
  revalidatePath('/', 'layout')
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
  const { data, error } = await admin.from('couples').insert({}).select('id').single()
  if (error) return { error: error.message }
  await admin.rpc('renumeroter_couples')
  const { data: refreshed } = await admin.from('couples').select('numero').eq('id', data.id).single()
  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
  return { success: true, coupleId: data.id, numero: refreshed?.numero }
}

export async function adminUpdateCouple(coupleId: string, fields: { nom_couple?: string | null; date_anniversaire?: string | null; pairing_code?: string | null }) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('couples').update(fields).eq('id', coupleId)
  if (error) {
    if (error.message.includes('duplicate key')) return { error: 'Ce code couple est déjà utilisé par un autre couple.' }
    return { error: error.message }
  }
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminUpdateProfile(userId: string, fields: { prenom?: string | null; nom?: string | null }) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(fields).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
  return { success: true }
}

export async function adminDeleteCouple(coupleId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('profiles').update({ couple_id: null, role: null }).eq('couple_id', coupleId)
  const { error } = await admin.from('couples').delete().eq('id', coupleId)
  if (error) return { error: error.message }
  await admin.rpc('renumeroter_couples')
  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
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
    from: '"YES BOX" <lise.yesbox@gmail.com>',
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

export async function adminRenvoyerCodeCouple(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('email, prenom, couple_id').eq('id', userId).single()
  if (!profile?.email) return { error: 'Utilisateur introuvable' }
  if (!profile.couple_id) return { error: 'Cet utilisateur n\'a pas de couple' }

  const { data: couple } = await admin.from('couples').select('pairing_code').eq('id', profile.couple_id).single()
  if (!couple?.pairing_code) return { error: 'Code couple introuvable' }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return { error: 'GMAIL non configuré' }

  await sendWelcomeEmail(profile.email, profile.prenom || '', couple.pairing_code)
  return { success: true }
}

export async function adminDeleteUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('couple_id').eq('id', userId).single()
  const coupleId = profile?.couple_id

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  if (coupleId) {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('couple_id', coupleId)
    if (!count) await admin.from('couples').delete().eq('id', coupleId)
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
  return { success: true }
}

function fmtAnswer(q: Question, val: string | null | undefined): string {
  if (val === undefined || val === null || val === '') return '(pas de réponse)'
  if (q.type === 'choix' && q.options) return q.options[parseInt(val)] ?? val
  if (q.type === 'choix_multiple' && q.options) {
    return val.split('||').map(i => q.options![parseInt(i)]).filter(Boolean).join(', ') || val
  }
  if (q.type === 'echelle') return `${val} / ${q.max ?? 10}`
  return val
}

export async function adminGetCoupleArchive(coupleId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: couple } = await admin
    .from('couples')
    .select('numero, nom_couple, date_anniversaire, pairing_code')
    .eq('id', coupleId)
    .single()
  if (!couple) return { error: 'Couple introuvable' }

  const [{ data: members }, { data: modules }, { data: journal }, effectiveModules] = await Promise.all([
    admin.from('profiles').select('id, prenom, nom, email, role').eq('couple_id', coupleId),
    admin.from('modules').select('id, slug').eq('couple_id', coupleId),
    admin.from('journal_entries').select('module_slug, contenu').eq('couple_id', coupleId),
    getEffectiveModules(),
  ])

  const moduleIds = (modules || []).map(m => m.id)
  const { data: reponses } = moduleIds.length
    ? await admin.from('reponses').select('module_id, user_id, question_slug, valeur').in('module_id', moduleIds)
    : { data: [] }

  const membersList = members || []

  const lines: string[] = []
  const titre = `Couple ${couple.numero}${couple.nom_couple ? ` — ${couple.nom_couple}` : ''}`
  lines.push('YES BOX — Le Pacte — Archive des réponses')
  lines.push(titre)
  if (couple.date_anniversaire) lines.push(`Date de couple : ${couple.date_anniversaire}`)
  if (couple.pairing_code) lines.push(`Code couple : ${couple.pairing_code}`)
  lines.push(`Membres : ${membersList.map(m => `${[m.prenom, m.nom].filter(Boolean).join(' ') || '—'} <${m.email}>`).join(' & ') || '—'}`)
  lines.push(`Généré le ${new Date().toLocaleString('fr-FR')}`)
  lines.push('')

  for (const modInfo of effectiveModules) {
    const mod = (modules || []).find(m => m.slug === modInfo.slug)
    lines.push('='.repeat(60))
    lines.push(`Module : ${modInfo.titre}`)
    lines.push('='.repeat(60))

    if (!mod) {
      lines.push('(module non commencé)')
      lines.push('')
      continue
    }

    for (const q of modInfo.questions) {
      lines.push(`- ${q.texte}`)
      for (const member of membersList) {
        const r = (reponses || []).find(r => r.module_id === mod.id && r.user_id === member.id && r.question_slug === q.slug)
        lines.push(`  ${member.prenom || member.email} : ${fmtAnswer(q, r?.valeur)}`)
      }
      lines.push('')
    }

    const j = (journal || []).find(j => j.module_slug === modInfo.slug)
    if (j?.contenu?.trim()) {
      lines.push('Journal du couple :')
      lines.push(j.contenu.trim())
      lines.push('')
    }
  }

  return {
    success: true as const,
    filename: `yesbox-couple-${couple.numero}-archive.txt`,
    content: lines.join('\n'),
  }
}

interface NewModuleInput {
  slug: string
  ordre: number
  titre: string
  sousTitre?: string
  description?: string
  emoji?: string
  gratuit: boolean
}

export async function adminCreateModule(input: NewModuleInput) {
  await assertAdmin()
  const admin = createAdminClient()

  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
  if (!slug) return { error: 'Slug invalide' }
  if (!input.titre.trim()) return { error: 'Le titre est requis' }
  if (MODULES.some(m => m.slug === slug)) return { error: 'Ce slug est déjà utilisé par un module existant' }

  const { error } = await admin.from('module_definitions').insert({
    slug,
    ordre: input.ordre,
    titre: input.titre.trim(),
    sous_titre: input.sousTitre?.trim() || null,
    description: input.description?.trim() || null,
    emoji: input.emoji?.trim() || '✦',
    gratuit: input.gratuit,
  })
  if (error) return { error: error.message.includes('duplicate') ? 'Ce slug est déjà utilisé' : error.message }

  await admin.rpc('backfill_module_pour_tous_les_couples', { p_slug: slug })

  revalidateModuleLists()
  return { success: true, slug }
}

export async function adminUpdateModule(id: string, fields: {
  titre?: string; sousTitre?: string; description?: string; emoji?: string; gratuit?: boolean; ordre?: number
}) {
  await assertAdmin()
  const admin = createAdminClient()

  const patch: Record<string, string | number | boolean | null> = { updated_at: new Date().toISOString() }
  if (fields.titre !== undefined) patch.titre = fields.titre.trim()
  if (fields.sousTitre !== undefined) patch.sous_titre = fields.sousTitre.trim() || null
  if (fields.description !== undefined) patch.description = fields.description.trim() || null
  if (fields.emoji !== undefined) patch.emoji = fields.emoji.trim() || '✦'
  if (fields.gratuit !== undefined) patch.gratuit = fields.gratuit
  if (fields.ordre !== undefined) patch.ordre = fields.ordre

  const { error } = await admin.from('module_definitions').update(patch).eq('id', id)
  if (error) return { error: error.message }

  revalidateModuleLists()
  return { success: true }
}

export async function adminDeleteModule(id: string, slug: string) {
  await assertAdmin()
  const admin = createAdminClient()

  await admin.from('modules').delete().eq('slug', slug)
  await admin.from('journal_entries').delete().eq('module_slug', slug)
  await admin.from('settings').delete().eq('key', `module_questions_override::${slug}`)

  const { error } = await admin.from('module_definitions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidateModuleLists()
  return { success: true }
}
