'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { createClient } from '@/lib/supabase/server'
import { randomInt } from 'crypto'
import { normalizeOverrides, emptyOverrides, getEffectiveModules, META_OVERRIDE_KEY_PREFIX, type ModuleContentOverrides, type QuestionOverride, type ModuleMetaOverride } from '@/lib/modules-effective'
import { SITE_CONTENT_PREFIX } from '@/lib/site-content'
import { assertAdmin } from '@/lib/admin-mail'
import { envoyerMail, mailConfigure } from '@/lib/mailer'
import { sendWelcomeEmail, envoyerBienvenueSiEnAttente } from '@/lib/welcome-email'
import { renvoyerMailConfirmation } from '@/lib/confirmation-email'
import { langueDuProfil, languesDesProfils } from '@/lib/i18n/langue-profil'
import type { Locale } from '@/lib/i18n/locale'
import { supprimerCompte } from '@/lib/suppression-compte'
import { MODULES } from '@/lib/modules-data'
import { chargerPersonnesSegment } from '@/lib/segments-donnees'
import { filtrerSegment, type FiltresSegment } from '@/lib/segments'
import { piedDePageRappel } from '@/lib/desinscription'
import { envoyerEmailsAnniversaires, type TypeGrandeDate } from '@/lib/grandes-dates'
import { estModeleEmail, modeleEmail, variablesDuModele, type ContenuEmail } from '@/lib/modeles-email/catalogue'
import { rendreCorps, rendreObjet, variablesDuTexte, variablesNonRemplacees, type Variables } from '@/lib/modeles-email/rendu'
import { cleReglageModele, envoyerModele, viderCacheModeles } from '@/lib/modeles-email/serveur'
import type { QuestionType } from '@/types'

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

const MODULE_INTROUVABLE = 'Module introuvable pour ce couple.'

export async function adminUnlockModule(coupleId: string, slug: string) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', slug).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: MODULE_INTROUVABLE }
  revalidatePath('/admin/couples')
  revalidatePath('/admin/actions')
  return { success: true }
}

export async function adminLockModule(coupleId: string, slug: string) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('modules').update({ statut: 'locked', revealed: false, revealed_at: null, reponses_partagees: false }).eq('couple_id', coupleId).eq('slug', slug).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: MODULE_INTROUVABLE }
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminRevealModule(coupleId: string, slug: string) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('modules').update({ revealed: true, revealed_at: new Date().toISOString() }).eq('couple_id', coupleId).eq('slug', slug).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: MODULE_INTROUVABLE }
  // Déverrouille le suivant
  const ordre = (await getEffectiveModules()).map(m => m.slug)
  const idx = ordre.indexOf(slug)
  if (idx >= 0 && idx < ordre.length - 1) {
    const { error: errSuivant } = await supabase.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', ordre[idx + 1])
    if (errSuivant) return { error: `Module révélé, mais le suivant n'a pas pu être ouvert : ${errSuivant.message}` }
  }
  revalidatePath('/admin/couples')
  return { success: true }
}

export async function adminResetModule(coupleId: string, slug: string) {
  await assertAdmin()
  const supabase = createAdminClient()
  const { data: mod } = await supabase.from('modules').select('id').eq('couple_id', coupleId).eq('slug', slug).maybeSingle()
  if (!mod) return { error: MODULE_INTROUVABLE }
  const etapes = [
    () => supabase.from('reponses').delete().eq('module_id', mod.id),
    () => supabase.from('journal_entries').delete().eq('couple_id', coupleId).eq('module_slug', slug),
    // Le module repart de zéro : les e-mails entre partenaires pourront repartir.
    () => supabase.from('notifications_module').delete().eq('module_id', mod.id),
    () => supabase.from('modules').update({ statut: 'en_cours', revealed: false, revealed_at: null, completed_at: null, reponses_partagees: false }).eq('id', mod.id),
  ]
  for (const etape of etapes) {
    const { error } = await etape()
    if (error) return { error: `Réinitialisation incomplète : ${error.message}` }
  }
  revalidatePath('/admin/couples')
  return { success: true }
}

// ---------------------------------------------------------------------------
// E-mails écrits à la main (Admin > Actions manuelles) : à partir de rien ou
// d'un modèle d'e-mail automatique, en français, en anglais, ou dans la
// langue choisie par chaque personne (les deux versions sont alors
// nécessaires). Variables remplacées pour chaque personne : {prenom},
// {partenaire} (prénom de l'autre membre du couple) et {code} (code couple).
// ---------------------------------------------------------------------------

export type ModeEnvoi = 'fr' | 'en' | 'langue'
export interface MessageManuel { fr: ContenuEmail; en: ContenuEmail; modele?: string | null }

const VARIABLES_MANUELLES = ['prenom', 'partenaire', 'code']

function verifierMessage(message: MessageManuel, mode: ModeEnvoi): string | null {
  const langues: Locale[] = mode === 'langue' ? ['fr', 'en'] : [mode]
  for (const l of langues) {
    if (!message[l].objet.trim() || !message[l].corps.trim()) {
      return mode === 'langue'
        ? 'Remplis l’objet et le message en français ET en anglais pour envoyer selon la langue de chaque personne.'
        : `Remplis l’objet et le message de la version ${l === 'fr' ? 'française' : 'anglaise'}.`
    }
  }
  const restantes = variablesNonRemplacees(
    langues.flatMap(l => [message[l].objet, message[l].corps]),
    Object.fromEntries(VARIABLES_MANUELLES.map(v => [v, ''])),
  )
  if (restantes.length) {
    return `Ces variables ne peuvent pas être remplies pour un envoi manuel : ${restantes.map(v => `{${v}}`).join(', ')}. Remplace-les par le texte voulu.`
  }
  return null
}

function etiquetteManuelle(message: MessageManuel) {
  return message.modele && estModeleEmail(message.modele) ? `envoi manuel · modèle : ${modeleEmail(message.modele).nom}` : 'envoi manuel'
}

// Prénom, prénom de l'autre membre du couple, code couple et langue de
// chaque personne.
async function contexteDestinataires(admin: ReturnType<typeof createAdminClient>, ids: string[]) {
  const contexte = new Map<string, { prenom: string; partenaire: string; code: string; langue: Locale }>()
  if (!ids.length) return contexte
  const { data: personnes } = await admin.from('profiles').select('id, prenom, couple_id').in('id', ids)
  const coupleIds = [...new Set((personnes ?? []).map(p => p.couple_id).filter((c): c is string => !!c))]
  const [{ data: membres }, { data: couples }, langues] = await Promise.all([
    coupleIds.length ? admin.from('profiles').select('id, prenom, couple_id').in('couple_id', coupleIds) : Promise.resolve({ data: [] as { id: string; prenom: string | null; couple_id: string | null }[] }),
    coupleIds.length ? admin.from('couples').select('id, pairing_code').in('id', coupleIds) : Promise.resolve({ data: [] as { id: string; pairing_code: string | null }[] }),
    languesDesProfils(admin, ids),
  ])
  for (const p of personnes ?? []) {
    const autre = (membres ?? []).find(m => m.couple_id && m.couple_id === p.couple_id && m.id !== p.id)
    contexte.set(p.id, {
      prenom: p.prenom?.trim() || '',
      partenaire: autre?.prenom?.trim() || '',
      code: (couples ?? []).find(c => c.id === p.couple_id)?.pairing_code || '',
      langue: langues.get(p.id) ?? 'fr',
    })
  }
  return contexte
}

function rendreMessage(message: MessageManuel, langue: Locale, vars: Variables) {
  return { objet: rendreObjet(message[langue].objet, vars), html: rendreCorps(message[langue].corps, vars) }
}

export async function adminSendEmail(to: string, message: MessageManuel, mode: ModeEnvoi) {
  await assertAdmin()
  if (!mailConfigure()) return { error: 'Envoi d\'e-mails non configuré' }
  const adresse = to.trim()
  if (!adresse) return { error: 'Destinataire requis' }
  const erreur = verifierMessage(message, mode)
  if (erreur) return { error: erreur }

  // Adresse d'une personne inscrite : prénom, partenaire, code et langue.
  const admin = createAdminClient()
  const { data: profil } = await admin.from('profiles').select('id').eq('email', adresse.toLowerCase()).maybeSingle()
  const ctx = profil ? (await contexteDestinataires(admin, [profil.id])).get(profil.id) : undefined
  const langue: Locale = mode === 'langue' ? ctx?.langue ?? 'fr' : mode
  const { objet, html } = rendreMessage(message, langue, { prenom: ctx?.prenom ?? '', partenaire: ctx?.partenaire ?? '', code: ctx?.code ?? '' })

  const envoye = await envoyerMail({ to: adresse, subject: objet, body: html, etiquette: etiquetteManuelle(message) })
  if (!envoye) return { error: 'Échec de l\'envoi' }
  return { success: true, langue }
}

// Envoi d'un même message à toutes les personnes d'un segment. Le segment
// est recalculé ici à partir des données à jour (jamais pris tel quel du
// navigateur). Chaque e-mail porte le lien de désinscription des rappels.
export async function adminEnvoyerEmailSegment(filtres: FiltresSegment, message: MessageManuel, mode: ModeEnvoi) {
  await assertAdmin()
  if (!mailConfigure()) return { error: 'Envoi d\'e-mails non configuré' }
  const erreur = verifierMessage(message, mode)
  if (erreur) return { error: erreur }

  const admin = createAdminClient()
  const personnes = filtrerSegment(await chargerPersonnesSegment(admin), filtres)
  if (!personnes.length) return { error: 'Aucune personne dans ce segment' }
  const contexte = await contexteDestinataires(admin, personnes.map(p => p.id))

  let envoyes = 0
  const parLangue = { fr: 0, en: 0 }
  const echecs: string[] = []
  for (const p of personnes) {
    const ctx = contexte.get(p.id)
    const langue: Locale = mode === 'langue' ? ctx?.langue ?? 'fr' : mode
    const { objet, html } = rendreMessage(message, langue, { prenom: ctx?.prenom ?? p.prenom ?? '', partenaire: ctx?.partenaire ?? '', code: ctx?.code ?? '' })
    const ok = await envoyerMail({ to: p.email, subject: objet, body: html + piedDePageRappel(p.id, langue), etiquette: etiquetteManuelle(message) })
    if (ok) { envoyes += 1; parLangue[langue] += 1 }
    else echecs.push(p.email)
    // Reste sous la limite d'envoi de Resend (quelques e-mails par seconde).
    await new Promise(r => setTimeout(r, 600))
  }
  return { success: true, envoyes, parLangue, echecs }
}

// Modèles d'e-mails automatiques modifiés depuis Admin > Messages & e-mails.
export async function adminSaveModeleEmail(cle: string, langue: Locale, contenu: ContenuEmail) {
  const supabase = await assertAdmin()
  if (!estModeleEmail(cle) || (langue !== 'fr' && langue !== 'en')) return { error: 'Modèle inconnu' }
  if (!contenu.objet.trim() || !contenu.corps.trim()) return { error: 'L’objet et le message sont obligatoires.' }
  const modele = modeleEmail(cle)
  const presentes = new Set([contenu.objet, contenu.corps].flatMap(variablesDuTexte))
  const manquantes = (modele.obligatoires ?? []).filter(v => !presentes.has(v))
  if (manquantes.length) return { error: `Cet e-mail doit contenir ${manquantes.map(v => `{${v}}`).join(', ')} (sinon il ne sert plus à rien).` }
  const connues = new Set(variablesDuModele(modele))
  const inconnues = [...presentes].filter(v => !connues.has(v))
  if (inconnues.length) return { error: `Variables inconnues pour cet e-mail : ${inconnues.map(v => `{${v}}`).join(', ')}.` }

  const { error } = await supabase.from('settings').upsert({ key: cleReglageModele(cle, langue), value: JSON.stringify({ objet: contenu.objet, corps: contenu.corps }) }, { onConflict: 'key' })
  if (error) return { error: error.message }
  viderCacheModeles()
  revalidatePath('/admin/messages')
  revalidatePath('/admin/actions')
  return { success: true }
}

export async function adminResetModeleEmail(cle: string, langue: Locale) {
  const supabase = await assertAdmin()
  if (!estModeleEmail(cle)) return { error: 'Modèle inconnu' }
  const cles = [cleReglageModele(cle, langue)]
  // Ancien réglage de l'e-mail de bienvenue (version française).
  if (cle === 'bienvenue' && langue === 'fr') cles.push('email_bienvenue_subject', 'email_bienvenue_body')
  const { error } = await supabase.from('settings').delete().in('key', cles)
  if (error) return { error: error.message }
  viderCacheModeles()
  revalidatePath('/admin/messages')
  revalidatePath('/admin/actions')
  return { success: true, contenu: modeleEmail(cle)[langue] }
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
  lignes?: string[]
  colonnesMoiToi?: boolean
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

export async function adminMoveQuestion(moduleSlug: string, questionSlug: string, direction: 'up' | 'down') {
  const supabase = await assertAdmin()
  const base = MODULES.find(m => m.slug === moduleSlug)
  if (!base) return { error: 'Module introuvable' }

  const current = await readModuleOverrides(supabase, moduleSlug)
  const hidden = new Set(current.hidden)
  const activeSlugs = [
    ...base.questions.filter(q => !hidden.has(q.slug)).map(q => q.slug),
    ...current.custom.map(q => q.slug),
  ]

  const ordered = current.order.length
    ? [...current.order.filter(s => activeSlugs.includes(s)), ...activeSlugs.filter(s => !current.order.includes(s))]
    : activeSlugs

  const idx = ordered.indexOf(questionSlug)
  if (idx === -1) return { error: 'Question introuvable' }
  const swapWith = direction === 'up' ? idx - 1 : idx + 1
  if (swapWith < 0 || swapWith >= ordered.length) return { success: true }

  ;[ordered[idx], ordered[swapWith]] = [ordered[swapWith], ordered[idx]]
  current.order = ordered
  await writeModuleOverrides(supabase, moduleSlug, current)
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

async function readModuleMeta(supabase: Awaited<ReturnType<typeof createClient>>, moduleSlug: string): Promise<ModuleMetaOverride> {
  const key = `${META_OVERRIDE_KEY_PREFIX}${moduleSlug}`
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  if (!data?.value) return {}
  try {
    return JSON.parse(data.value)
  } catch {
    return {}
  }
}

export async function adminSaveModuleMeta(moduleSlug: string, fields: {
  titre?: string; sousTitre?: string; description?: string; emoji?: string
}) {
  const supabase = await assertAdmin()
  if (!MODULES.some(m => m.slug === moduleSlug)) return { error: 'Module introuvable' }

  const current = await readModuleMeta(supabase, moduleSlug)
  const next: ModuleMetaOverride = { ...current }
  if (fields.titre !== undefined) next.titre = fields.titre.trim() || undefined
  if (fields.sousTitre !== undefined) next.sousTitre = fields.sousTitre.trim() || undefined
  if (fields.description !== undefined) next.description = fields.description.trim() || undefined
  if (fields.emoji !== undefined) next.emoji = fields.emoji.trim() || undefined
  delete next.n // la position des modules de base n'est plus modifiable

  const key = `${META_OVERRIDE_KEY_PREFIX}${moduleSlug}`
  await supabase.from('settings').upsert({ key, value: JSON.stringify(next) }, { onConflict: 'key' })
  revalidateModuleLists()
  revalidateModuleContent(moduleSlug)
  return { success: true }
}

export async function adminResetModuleMeta(moduleSlug: string) {
  const supabase = await assertAdmin()
  await supabase.from('settings').delete().eq('key', `${META_OVERRIDE_KEY_PREFIX}${moduleSlug}`)
  revalidateModuleLists()
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

export async function adminUpdateCouple(coupleId: string, fields: { nom_couple?: string | null; date_anniversaire?: string | null; date_mariage?: string | null; pairing_code?: string | null }) {
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

export async function adminUpdateProfile(userId: string, fields: { prenom?: string | null }) {
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

  if (!mailConfigure()) {
    return { success: true, password: newPassword, emailed: false }
  }

  const langue = await langueDuProfil(admin, userId)
  const emailed = await envoyerModele({ to: email, cle: 'nouveau_mot_de_passe', locale: langue, vars: { prenom: profile?.prenom || '', mot_de_passe: newPassword } })

  return { success: true, password: newPassword, emailed }
}

export async function adminRenvoyerBienvenue(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data: profile } = await admin.from('profiles').select('email, prenom, couple_id').eq('id', userId).single()
  if (!profile?.email) return { error: 'Utilisateur introuvable' }
  if (!profile.couple_id) return { error: 'Cet utilisateur n\'a pas de couple' }

  const { data: couple } = await admin.from('couples').select('pairing_code').eq('id', profile.couple_id).single()
  if (!couple?.pairing_code) return { error: 'Code couple introuvable' }

  if (!mailConfigure()) return { error: 'Envoi d\'e-mails non configuré' }

  const envoye = await sendWelcomeEmail(profile.email, profile.prenom || '', couple.pairing_code, await langueDuProfil(admin, userId))
  if (!envoye) return { error: 'Échec de l\'envoi' }
  // Évite un second envoi automatique à la prochaine connexion.
  await admin.from('profiles').update({ email_bienvenue_envoye_le: new Date().toISOString() }).eq('id', userId).is('email_bienvenue_envoye_le', null)
  return { success: true }
}

export async function adminRenvoyerConfirmation(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data } = await admin.auth.admin.getUserById(userId)
  const email = data?.user?.email
  if (!email) return { error: 'Utilisateur introuvable' }
  if (!mailConfigure()) return { error: 'Envoi d\'e-mails non configuré' }

  const res = await renvoyerMailConfirmation(email)
  if (res.ok) return { success: true }
  if (res.raison === 'deja_confirme') return { error: 'Adresse déjà confirmée' }
  if (res.raison === 'envoi') return { error: `Échec de l'envoi${res.erreur ? ` — ${res.erreur}` : ''}` }
  return { error: res.raison || 'Échec' }
}

// Confirme l'adresse sans passer par le mail (ex. mail qui n'arrive pas) :
// la personne peut alors se connecter et commencer les modules. Le mail de
// bienvenue (avec le code couple) part s'il n'a pas encore été envoyé.
export async function adminConfirmerEmail(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { data } = await admin.auth.admin.getUserById(userId)
  if (!data?.user) return { error: 'Utilisateur introuvable' }
  if (data.user.email_confirmed_at) return { error: 'Adresse déjà confirmée' }

  const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true })
  if (error) return { error: error.message }

  await envoyerBienvenueSiEnAttente(userId)
  revalidatePath('/admin/utilisateurs')
  return { success: true }
}

export async function adminDeleteUser(userId: string) {
  await assertAdmin()
  const admin = createAdminClient()

  const { error } = await supprimerCompte(admin, userId)
  if (error) return { error }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/couples')
  revalidatePath('/admin/securite')
  return { success: true }
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

function genererCodeAleatoire() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[randomInt(chars.length)]
  return code
}

export async function adminCreerCodeGratuit(fields: {
  code?: string; dureeMois?: number | null; usagesMax: number; note?: string
}) {
  await assertAdmin()
  const admin = createAdminClient()

  const code = (fields.code?.trim() || genererCodeAleatoire()).toUpperCase()
  const { data, error } = await admin.from('codes_gratuits').insert({
    code,
    duree_mois: fields.dureeMois ?? null,
    usages_max: fields.usagesMax,
    note: fields.note?.trim() || null,
  }).select('id').single()
  if (error) return { error: error.message }

  revalidatePath('/admin/codes')
  return { success: true, code, id: data.id as string }
}

export async function adminBasculerCodeGratuit(id: string, actif: boolean) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('codes_gratuits').update({ actif }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/codes')
  return { success: true }
}

// Nombre maximum d'utilisations modifiable après création, sans descendre
// sous le nombre de couples ayant déjà utilisé le code.
export async function adminModifierUsagesMaxCode(id: string, usagesMax: number) {
  await assertAdmin()
  if (!Number.isInteger(usagesMax) || usagesMax < 1) return { error: 'Le nombre d’utilisations doit être un entier supérieur ou égal à 1.' }
  const admin = createAdminClient()
  const { data: code, error: lectureError } = await admin.from('codes_gratuits').select('usages').eq('id', id).single()
  if (lectureError || !code) return { error: lectureError?.message || 'Code introuvable.' }
  if (usagesMax < code.usages) return { error: `Ce code a déjà été utilisé ${code.usages} fois : le maximum ne peut pas être inférieur.` }
  const { error } = await admin.from('codes_gratuits').update({ usages_max: usagesMax }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/codes')
  return { success: true }
}

// Attribue un code gratuit au couple d'un membre inscrit, comme s'il l'avait
// saisi lui-même (mêmes règles : code actif, pas épuisé ; charte de la bêta
// demandée ensuite pour les codes concernés). Un couple n'a qu'un code : avec
// `remplacer`, l'ancien est retiré (et son utilisation décomptée) avant.
export async function adminAttribuerCode(userId: string, code: string, remplacer = false) {
  await assertAdmin()
  const admin = createAdminClient()
  const cleanCode = code.trim().toUpperCase()
  if (!cleanCode) return { error: 'Choisis un code.' }

  const { data: profile } = await admin.from('profiles').select('couple_id').eq('id', userId).single()
  if (!profile?.couple_id) return { error: 'Cette personne n\'a pas encore d\'espace couple : impossible de lui attribuer un code.' }
  const coupleId = profile.couple_id as string

  const { data: nouveau } = await admin.from('codes_gratuits').select('id, actif, usages, usages_max').eq('code', cleanCode).maybeSingle()
  if (!nouveau || !nouveau.actif) return { error: 'Code invalide ou désactivé.' }
  if (nouveau.usages >= nouveau.usages_max) return { error: 'Ce code a atteint son nombre maximum d\'utilisations : augmente-le dans Codes gratuits.' }

  const { data: existant } = await admin.from('codes_gratuits_utilisations').select('id, code_id, codes_gratuits(code, usages)').eq('couple_id', coupleId).maybeSingle()
  if (existant) {
    const lie = existant.codes_gratuits as { code?: string; usages?: number } | { code?: string; usages?: number }[] | null
    const ancien = Array.isArray(lie) ? lie[0] : lie
    if (ancien?.code === cleanCode) return { error: `Ce couple a déjà le code ${cleanCode}.` }
    if (!remplacer) return { error: `Ce couple a déjà le code ${ancien?.code ?? '—'}.`, codeExistant: ancien?.code ?? '—' }
    const { error: suppression } = await admin.from('codes_gratuits_utilisations').delete().eq('id', existant.id)
    if (suppression) return { error: suppression.message }
    await admin.from('codes_gratuits').update({ usages: Math.max(0, (ancien?.usages ?? 1) - 1) }).eq('id', existant.code_id)
  }

  const { data, error } = await admin.rpc('utiliser_code_gratuit', { p_code: cleanCode, p_couple_id: coupleId })
  if (error) return { error: error.message }
  if (!data?.success) {
    const messages: Record<string, string> = { invalide: 'Code invalide', epuise: 'Ce code a atteint son nombre maximum d\'utilisations', deja_utilise: 'Ce couple a déjà un code' }
    return { error: messages[data?.error] ?? 'Code invalide' }
  }

  revalidatePath('/admin/utilisateurs')
  revalidatePath('/admin/codes')
  revalidatePath('/admin/actions')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Tâches : validation des e-mails d'anniversaire (Admin > Vue d'ensemble),
// avec un mot personnel facultatif. Validé le jour même de l'envoi (après le
// passage de la tâche du matin), l'e-mail part tout de suite.
// ---------------------------------------------------------------------------

function verifierTache(type: string, anniversaire: string) {
  return (type === 'rencontre' || type === 'mariage') && /^\d{4}-\d{2}-\d{2}$/.test(anniversaire)
}

export async function adminValiderEmailAnniversaire(coupleId: string, type: TypeGrandeDate, anniversaire: string, mot: string) {
  await assertAdmin()
  if (!verifierTache(type, anniversaire)) return { error: 'Tâche invalide' }
  const admin = createAdminClient()
  const { error } = await admin.from('validations_emails').upsert(
    { couple_id: coupleId, type, anniversaire, valide_le: new Date().toISOString(), mot: mot.trim().slice(0, 2000) || null },
    { onConflict: 'couple_id,type,anniversaire' },
  )
  if (error) return { error: error.message.includes('validations_emails') ? 'Table validations_emails absente : lance la commande SQL de la dernière mise à jour dans Supabase.' : error.message }
  const envoyes = await envoyerEmailsAnniversaires(admin, coupleId)
  revalidatePath('/admin')
  return { success: true, envoyes }
}

export async function adminAnnulerValidationEmail(coupleId: string, type: TypeGrandeDate, anniversaire: string) {
  await assertAdmin()
  if (!verifierTache(type, anniversaire)) return { error: 'Tâche invalide' }
  const admin = createAdminClient()
  const { error } = await admin.from('validations_emails').delete().eq('couple_id', coupleId).eq('type', type).eq('anniversaire', anniversaire)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}
