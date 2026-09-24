'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { getEffectiveModules } from '@/lib/modules-effective'
import { conclusionDuModule } from '@/lib/modules-data'
import { formatAnswer } from '@/lib/questions'
import { supprimerCompte } from '@/lib/suppression-compte'

export async function updateMesInfos(nom: string, prenom: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!prenom.trim()) return { error: t(locale, 'Le prénom est requis', 'First name is required') }

  const { error } = await supabase
    .from('profiles')
    .update({ nom: nom.trim() || null, prenom: prenom.trim() })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updatePrenomPartenaire(prenom: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!prenom.trim()) return { error: t(locale, 'Le prénom est requis', 'First name is required') }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ prenom: prenom.trim() })
    .eq('couple_id', myProfile.couple_id)
    .neq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateNomCouple(nomCouple: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  // Client admin : la même mise à jour via le client authentifié échoue
  // silencieusement sous RLS (cf. creerCouple dans couple.ts).
  const admin = createAdminClient()
  const { error } = await admin
    .from('couples')
    .update({ nom_couple: nomCouple.trim() || null })
    .eq('id', myProfile.couple_id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function updateDateAnniversaire(dateAnniversaire: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }

  const { error } = await supabase
    .from('couples')
    .update({ date_anniversaire: dateAnniversaire || null })
    .eq('id', myProfile.couple_id)

  if (error) return { error: error.message }
  revalidatePath('/mon-compte')
  revalidatePath('/pacte')
  revalidatePath('/tableau-de-bord')
  return { success: true }
}

export async function changerMonMotDePasse(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (newPassword.length < 8) return { error: t(locale, 'Le nouveau mot de passe doit contenir au moins 8 caractères', 'The new password must be at least 8 characters') }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) return { error: t(locale, 'Mot de passe actuel incorrect', 'Current password is incorrect') }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

  return { success: true }
}

// Export des données du couple (droit d'accès et de portabilité, RGPD
// art. 15 et 20). Réservé aux membres du couple : l'espace admin n'a pas
// d'export des réponses. Lu avec le client de la personne connectée (RLS),
// et les réponses du ou de la partenaire ne figurent que pour les modules
// déjà révélés, comme dans l'app.
export async function telechargerMesDonnees() {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { data: moi } = await supabase.from('profiles').select('prenom, nom, email, couple_id').eq('id', user.id).single()
  if (!moi) return { error: t(locale, 'Profil introuvable', 'Profile not found') }

  const lines: string[] = []
  lines.push(t(locale, 'YES BOX — Le Pacte — Export de mes données', 'YES BOX — Le Pacte — Export of my data'))
  lines.push(`${t(locale, 'Généré le', 'Generated on')} ${new Date().toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')}`)
  lines.push('')
  lines.push(`${t(locale, 'Prénom', 'First name')} : ${moi.prenom || '—'}`)
  lines.push(`${t(locale, 'Nom', 'Last name')} : ${moi.nom || '—'}`)
  lines.push(`Email : ${moi.email}`)
  lines.push('')

  if (moi.couple_id) {
    const [{ data: couple }, { data: membres }, { data: modules }, { data: journal }, effectiveModules] = await Promise.all([
      supabase.from('couples').select('nom_couple, date_anniversaire, pacte_texte').eq('id', moi.couple_id).single(),
      supabase.from('profiles').select('id, prenom, email').eq('couple_id', moi.couple_id),
      supabase.from('modules').select('id, slug, revealed').eq('couple_id', moi.couple_id),
      supabase.from('journal_entries').select('module_slug, user_id, question_slug, valeur').eq('couple_id', moi.couple_id),
      getEffectiveModules(),
    ])
    const moduleIds = (modules || []).map(m => m.id)
    const { data: reponses } = moduleIds.length
      ? await supabase.from('reponses').select('module_id, user_id, question_slug, valeur').in('module_id', moduleIds)
      : { data: [] }

    // Moi d'abord, puis le ou la partenaire.
    const membresList = (membres || []).sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0))
    const nomDe = (m: { prenom: string | null; email: string }) => m.prenom || m.email
    const pasDeReponse = t(locale, '(pas de réponse)', '(no answer)')

    if (couple?.nom_couple) lines.push(`${t(locale, 'Nom du couple', 'Couple name')} : ${couple.nom_couple}`)
    if (couple?.date_anniversaire) lines.push(`${t(locale, 'Date de couple', 'Couple date')} : ${couple.date_anniversaire}`)
    lines.push(`${t(locale, 'Membres', 'Members')} : ${membresList.map(nomDe).join(' & ')}`)
    lines.push('')

    for (const modInfo of effectiveModules) {
      const mod = (modules || []).find(m => m.slug === modInfo.slug)
      lines.push('='.repeat(60))
      lines.push(`Module : ${modInfo.titre}`)
      lines.push('='.repeat(60))
      if (!mod) {
        lines.push(t(locale, '(module non commencé)', '(module not started)'))
        lines.push('')
        continue
      }
      const visibles = membresList.filter(m => m.id === user.id || mod.revealed)
      if (!mod.revealed && membresList.length > 1) {
        lines.push(t(locale, '(réponses de ton/ta partenaire visibles après la révélation)', "(your partner's answers are shown after the reveal)"))
      }
      for (const q of modInfo.questions) {
        lines.push(`- ${q.texte}`)
        for (const membre of visibles) {
          const r = (reponses || []).find(r => r.module_id === mod.id && r.user_id === membre.id && r.question_slug === q.slug)
          lines.push(`  ${nomDe(membre)} : ${formatAnswer(q, r?.valeur) ?? pasDeReponse}`)
        }
        lines.push('')
      }
      const conclusion = conclusionDuModule(modInfo)
      for (const membre of visibles) {
        const entrees = (journal || []).filter(j => j.module_slug === modInfo.slug && j.user_id === membre.id)
        const appris = entrees.find(j => j.question_slug === 'apprentissage')?.valeur?.trim()
        const surpris = entrees.find(j => j.question_slug === 'surprise')?.valeur?.trim()
        if (appris || surpris) {
          lines.push(`  ${nomDe(membre)} — ${conclusion.apprentissage.label} ${appris || '—'}`)
          lines.push(`  ${nomDe(membre)} — ${conclusion.surprise.label} ${surpris || '—'}`)
          lines.push('')
        }
      }
    }

    if (couple?.pacte_texte?.trim()) {
      lines.push('='.repeat(60))
      lines.push(t(locale, 'Notre pacte', 'Our pact'))
      lines.push('='.repeat(60))
      lines.push(couple.pacte_texte.trim())
      lines.push('')
    }
  }

  return {
    success: true as const,
    filename: 'yesbox-mes-donnees.txt',
    content: lines.join('\n'),
  }
}

// Suppression définitive du compte par la personne elle-même (droit à
// l'effacement, RGPD art. 17). Mot de passe redemandé pour éviter une
// suppression depuis une session laissée ouverte.
export async function supprimerMonCompte(motDePasse: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: motDePasse })
  if (reauthError) return { error: t(locale, 'Mot de passe incorrect', 'Incorrect password') }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (profile?.is_admin) {
    return { error: t(locale, 'Un compte admin ne peut pas être supprimé depuis cette page.', 'An admin account cannot be deleted from this page.') }
  }

  const { error } = await supprimerCompte(admin, user.id)
  if (error) return { error }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return { success: true }
}
