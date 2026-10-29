'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { assertAdmin, notifierNouvelAvis } from '@/lib/admin-mail'
import { langueDuProfil } from '@/lib/i18n/langue-profil'
import { envoyerModele } from '@/lib/modeles-email/serveur'
import { formaterMoisAvis, genererCodeAvis, PRENOM_AVIS_MAX, TEXTE_AVIS_MAX, TEXTE_AVIS_MIN } from '@/lib/avis'

export interface SaisieAvis {
  prenom: string
  /** AAAA-MM */
  debutMois: string
  note: number
  texte: string
  consentement: boolean
}

// Avis laissé sur /avis par une personne connectée : un par personne. Tant
// qu'il n'est pas validé, il peut être modifié ; refusé, il peut être
// réécrit. L'équipe est prévenue par e-mail et le retrouve dans
// Vue d'ensemble > Tâches.
export async function envoyerAvis(saisie: SaisieAvis): Promise<{ error: string } | { success: true }> {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Connecte-toi pour laisser un avis.', 'Log in to leave a review.') }

  const prenom = saisie.prenom.replace(/\s+/g, ' ').trim()
  const texte = saisie.texte.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  const note = Math.round(Number(saisie.note))
  if (!prenom || prenom.length > PRENOM_AVIS_MAX) return { error: t(locale, `Indique ton prénom ou tes initiales (${PRENOM_AVIS_MAX} caractères au plus).`, `Enter your first name or initials (${PRENOM_AVIS_MAX} characters max).`) }
  if (!(note >= 1 && note <= 5)) return { error: t(locale, 'Choisis une note de 1 à 5 étoiles.', 'Pick a rating from 1 to 5 stars.') }
  if (texte.length < TEXTE_AVIS_MIN) return { error: t(locale, 'Ton avis est un peu court : quelques mots de plus ?', 'Your review is a bit short: a few more words?') }
  if (texte.length > TEXTE_AVIS_MAX) return { error: t(locale, `Ton avis dépasse ${TEXTE_AVIS_MAX} caractères.`, `Your review is over ${TEXTE_AVIS_MAX} characters.`) }
  if (!saisie.consentement) return { error: t(locale, 'Coche la case pour accepter que ton avis soit publié.', 'Tick the box to agree to your review being published.') }

  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(saisie.debutMois)
  const maintenant = new Date()
  const moisCourant = `${maintenant.getUTCFullYear()}-${String(maintenant.getUTCMonth() + 1).padStart(2, '0')}`
  if (!m || saisie.debutMois > moisCourant || Number(m[1]) < 2024) return { error: t(locale, 'Choisis le mois où vous avez commencé la YES BOX.', 'Pick the month you started YES BOX.') }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('couple_id, email').eq('id', user.id).single()
  const { data: existant, error: erreurLecture } = await admin.from('avis').select('id, statut').eq('profile_id', user.id).maybeSingle()
  if (erreurLecture) return { error: t(locale, 'Les avis ne sont pas encore ouverts : réessaie un peu plus tard.', 'Reviews are not open yet: please try again a little later.') }
  if (existant?.statut === 'publie') return { error: t(locale, 'Ton avis est déjà publié : merci !', 'Your review is already published: thank you!') }

  const ligne = {
    profile_id: user.id,
    couple_id: profile?.couple_id ?? null,
    prenom,
    debut_mois: `${saisie.debutMois}-01`,
    note,
    texte,
    consentement_publication_le: maintenant.toISOString(),
    statut: 'en_attente',
    cree_le: maintenant.toISOString(),
    traite_le: null,
  }
  const { error } = await admin.from('avis').upsert(ligne, { onConflict: 'profile_id' })
  if (error) return { error: error.message }

  // Un avis encore en attente qui est seulement corrigé ne renvoie pas d'e-mail.
  if (existant?.statut !== 'en_attente') {
    after(() => notifierNouvelAvis({ prenom, email: profile?.email ?? user.email ?? null, note, texte, debutMois: formaterMoisAvis(ligne.debut_mois, 'fr') }))
  }
  revalidatePath('/avis')
  revalidatePath('/admin')
  return { success: true }
}

type AdminClient = ReturnType<typeof createAdminClient>
type Auteur = { prenom: string | null; email: string | null }

function auteurDe(profiles: unknown): Auteur | null {
  return (Array.isArray(profiles) ? profiles[0] : profiles) as Auteur | null
}

async function envoyerCodeAvis(admin: AdminClient, profileId: string, auteur: Auteur | null, code: string) {
  if (!auteur?.email) return false
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.fr'
  return envoyerModele({
    to: auteur.email,
    cle: 'avis_publie',
    locale: await langueDuProfil(admin, profileId),
    vars: { prenom: auteur.prenom ?? '', code, lien: `${appUrl}/mon-compte` },
  })
}

// Vue d'ensemble > Tâches : publier un avis l'affiche sur l'accueil et
// envoie à son auteur un code de 10 € de réduction (un seul par avis, même
// s'il est retiré puis republié).
export async function adminPublierAvis(id: string): Promise<{ error: string } | { success: true; emailEnvoye: boolean }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { data: avis } = await admin.from('avis').select('id, statut, code_reduction, profile_id, profiles(prenom, email)').eq('id', id).maybeSingle()
  if (!avis) return { error: 'Avis introuvable' }
  if (avis.statut === 'publie') return { error: 'Cet avis est déjà publié.' }

  const premierCode = !avis.code_reduction
  let code = avis.code_reduction
  let erreur: string | null = null
  // Code unique : nouvel essai dans le cas (très rare) où il existe déjà.
  for (let essai = 0; essai < 3; essai++) {
    code = avis.code_reduction ?? genererCodeAvis()
    const { error } = await admin.from('avis')
      .update({ statut: 'publie', traite_le: new Date().toISOString(), code_reduction: code })
      .eq('id', id)
    erreur = error?.message ?? null
    if (!error || avis.code_reduction || !error.message.includes('code_reduction')) break
  }
  if (erreur) return { error: erreur }

  const emailEnvoye = premierCode && !!code && await envoyerCodeAvis(admin, avis.profile_id, auteurDe(avis.profiles), code)
  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true, emailEnvoye }
}

export async function adminRefuserAvis(id: string): Promise<{ error: string } | { success: true }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('avis').update({ statut: 'refuse', traite_le: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true }
}

// Renvoie le code par e-mail (adresse changée, e-mail perdu…).
export async function adminRenvoyerCodeAvis(id: string): Promise<{ error: string } | { success: true }> {
  await assertAdmin()
  const admin = createAdminClient()
  const { data: avis } = await admin.from('avis').select('code_reduction, profile_id, profiles(prenom, email)').eq('id', id).maybeSingle()
  if (!avis?.code_reduction) return { error: 'Cet avis n’a pas encore de code.' }
  const ok = await envoyerCodeAvis(admin, avis.profile_id, auteurDe(avis.profiles), avis.code_reduction)
  return ok ? { success: true } : { error: 'L’e-mail n’a pas pu partir (adresse manquante ou erreur d’envoi).' }
}
