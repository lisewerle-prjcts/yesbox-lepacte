'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/server'
import { t } from '@/lib/i18n/locale'
import { getEffectiveModules } from '@/lib/modules-effective'
import { conclusionDuModule } from '@/lib/modules-data'
import { formatAnswer } from '@/lib/questions'
import { supprimerCompte } from '@/lib/suppression-compte'
import { consentementManquant } from '@/lib/consentement'
import { encoderRestauration, decoderRestauration, type DonneesRestauration } from '@/lib/restauration'
import { MODULE_RDV_ANNUEL } from '@/lib/progression'

export async function updateMesInfos(prenom: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (!prenom.trim()) return { error: t(locale, 'Le prénom est requis', 'First name is required') }

  const { error } = await supabase
    .from('profiles')
    .update({ prenom: prenom.trim() })
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

  const { data: moi } = await supabase.from('profiles').select('prenom, email, couple_id').eq('id', user.id).single()
  if (!moi) return { error: t(locale, 'Profil introuvable', 'Profile not found') }

  const lines: string[] = []
  lines.push(t(locale, 'YES BOX — Le Pacte — Export de mes données', 'YES BOX — Le Pacte — Export of my data'))
  lines.push(`${t(locale, 'Généré le', 'Generated on')} ${new Date().toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')}`)
  lines.push('')
  lines.push(`${t(locale, 'Prénom', 'First name')} : ${moi.prenom || '—'}`)
  lines.push(`Email : ${moi.email}`)
  lines.push('')

  let restauration: DonneesRestauration | null = null

  if (moi.couple_id) {
    const [{ data: couple }, { data: membres }, { data: modules }, { data: journal }, effectiveModules] = await Promise.all([
      supabase.from('couples').select('nom_couple, date_anniversaire, pacte_texte').eq('id', moi.couple_id).single(),
      supabase.from('profiles').select('id, prenom, email').eq('couple_id', moi.couple_id),
      supabase.from('modules').select('id, slug, statut, revealed, reponses_partagees').eq('couple_id', moi.couple_id),
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

    // Requête à part : si les colonnes de signature manquent en base,
    // l'export fonctionne quand même.
    const { data: signature } = await supabase.from('couples').select('pacte_signe_le, rdv_annuel_le').eq('id', moi.couple_id).maybeSingle()
    const emailDe = new Map(membresList.map(m => [m.id, m.email]))
    const slugDe = new Map((modules || []).map(m => [m.id, m.slug]))
    restauration = {
      version: 1,
      exporte_le: new Date().toISOString(),
      auteur_email: moi.email,
      couple: {
        nom_couple: couple?.nom_couple ?? null,
        date_anniversaire: couple?.date_anniversaire ?? null,
        pacte_texte: couple?.pacte_texte ?? null,
        pacte_signe_le: signature?.pacte_signe_le ?? null,
        rdv_annuel_le: signature?.rdv_annuel_le ?? null,
      },
      membres: membresList.map(m => ({ email: m.email, prenom: m.prenom })),
      modules: (modules || []).map(m => ({ slug: m.slug, statut: m.statut, revealed: m.revealed, reponses_partagees: m.reponses_partagees })),
      reponses: (reponses || [])
        .filter(r => emailDe.has(r.user_id) && slugDe.has(r.module_id))
        .map(r => ({ module_slug: slugDe.get(r.module_id)!, email: emailDe.get(r.user_id)!, question_slug: r.question_slug, valeur: r.valeur })),
      journal: (journal || [])
        .filter(j => emailDe.has(j.user_id))
        .map(j => ({ module_slug: j.module_slug, email: emailDe.get(j.user_id)!, question_slug: j.question_slug, valeur: j.valeur })),
    }
  }

  if (restauration) {
    lines.push('')
    lines.push('='.repeat(60))
    lines.push(t(locale, 'Données de restauration — ne pas modifier', 'Restore data — do not edit'))
    lines.push('='.repeat(60))
    lines.push(t(locale,
      "Si tu reviens après une désinscription, importe ce fichier depuis « Mon compte » pour retrouver vos réponses. La ligne ci-dessous sert à cette restauration : si elle est modifiée, le fichier ne pourra plus être importé.",
      'If you come back after unsubscribing, import this file from "My account" to get your answers back. The line below is used for this: if it is edited, the file can no longer be imported.'))
    lines.push(encoderRestauration(restauration))
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

// Consentement des comptes créés avant l'ajout des cases à l'inscription
// (page /consentement). Mêmes exigences et même preuve horodatée.
export async function enregistrerConsentement(formData: FormData) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: t(locale, 'Non authentifié', 'Not authenticated') }

  if (formData.get('age_minimum') !== 'on') {
    return { error: t(locale, 'Le programme est réservé aux personnes de 15 ans ou plus.', 'The program is reserved for people aged 15 or over.') }
  }
  if (formData.get('consentement_sensible') !== 'on') {
    return { error: t(locale, 'Ton consentement est nécessaire pour continuer le programme.', 'Your consent is required to continue the program.') }
  }

  const maintenant = new Date().toISOString()
  const { error } = await createAdminClient()
    .from('profiles')
    .update({ age_minimum_certifie_le: maintenant, consentement_donnees_sensibles_le: maintenant })
    .eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// Ré-import d'un fichier « Mes données » après une désinscription. Le bloc
// de restauration signé est vérifié, puis les données sont rattachées au
// couple actuel : chaque membre est retrouvé par son e-mail. Rien de ce qui
// existe déjà n'est écrasé (on complète seulement), et l'import peut être
// relancé, par exemple quand le ou la partenaire est revenu·e à son tour.
export async function importerMesDonnees(fichier: string) {
  const supabase = await createClient()
  const locale = await getLocale()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: t(locale, 'Non authentifié', 'Not authenticated') }
  if (await consentementManquant(supabase, user.id)) return { error: t(locale, 'Ton consentement est nécessaire pour enregistrer tes réponses.', 'Your consent is required to save your answers.') }

  const donnees = decoderRestauration(fichier)
  if (!donnees) {
    return { error: t(locale,
      'Ce fichier ne peut pas être importé : utilise le fichier téléchargé depuis « Mes données », sans le modifier.',
      'This file cannot be imported: use the file downloaded from "My data", without editing it.') }
  }

  const admin = createAdminClient()
  const { data: moi } = await admin.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!moi?.couple_id) return { error: t(locale, 'Aucun couple trouvé', 'No couple found') }
  const coupleId = moi.couple_id

  const normaliser = (e: string) => e.trim().toLowerCase()
  if (!donnees.membres.some(m => normaliser(m.email) === normaliser(user.email!))) {
    return { error: t(locale,
      'Ce fichier appartient à un autre compte : ton adresse e-mail n’y figure pas.',
      'This file belongs to another account: your email address is not in it.') }
  }

  const [{ data: membresActuels }, { data: modules }] = await Promise.all([
    admin.from('profiles').select('id, email').eq('couple_id', coupleId),
    admin.from('modules').select('id, slug, statut, revealed').eq('couple_id', coupleId),
  ])
  // E-mail du fichier → membre actuel du couple.
  const idDe = new Map<string, string>()
  for (const m of membresActuels ?? []) idDe.set(normaliser(m.email), m.id)
  const membresRetrouves = donnees.membres.filter(m => idDe.has(normaliser(m.email)))
  const coupleComplet = membresRetrouves.length === donnees.membres.length && donnees.membres.length >= 2
  const moduleDe = new Map((modules ?? []).map(m => [m.slug, m]))

  // Réponses : on ajoute celles qui manquent.
  const { data: existantes } = await admin.from('reponses').select('module_id, user_id, question_slug, valeur')
    .in('module_id', (modules ?? []).map(m => m.id))
  const dejaLa = new Set((existantes ?? []).filter(r => r.valeur?.trim()).map(r => `${r.module_id}|${r.user_id}|${r.question_slug}`))
  const reponsesAAjouter = donnees.reponses.flatMap(r => {
    const mod = moduleDe.get(r.module_slug)
    const userId = idDe.get(normaliser(r.email))
    if (!mod || !userId || !r.valeur?.trim() || dejaLa.has(`${mod.id}|${userId}|${r.question_slug}`)) return []
    return [{ module_id: mod.id, user_id: userId, question_slug: r.question_slug, valeur: r.valeur }]
  })
  if (reponsesAAjouter.length) {
    const { error } = await admin.from('reponses').upsert(reponsesAAjouter, { onConflict: 'module_id,user_id,question_slug' })
    if (error) return { error: error.message }
  }

  // Conclusions du journal : idem.
  const { data: journalExistant } = await admin.from('journal_entries').select('module_slug, user_id, question_slug, valeur').eq('couple_id', coupleId)
  const journalDejaLa = new Set((journalExistant ?? []).filter(j => j.valeur?.trim()).map(j => `${j.module_slug}|${j.user_id}|${j.question_slug}`))
  const journalAAjouter = donnees.journal.flatMap(j => {
    const userId = idDe.get(normaliser(j.email))
    if (!userId || !moduleDe.has(j.module_slug) || !j.valeur?.trim() || journalDejaLa.has(`${j.module_slug}|${userId}|${j.question_slug}`)) return []
    return [{ couple_id: coupleId, module_slug: j.module_slug, user_id: userId, question_slug: j.question_slug, valeur: j.valeur }]
  })
  if (journalAAjouter.length) {
    const { error } = await admin.from('journal_entries').upsert(journalAAjouter, { onConflict: 'couple_id,module_slug,user_id,question_slug' })
    if (error) return { error: error.message }
  }

  // Progression : seulement si les deux membres du fichier sont de retour
  // dans ce couple (sinon un module révélé montrerait des réponses absentes).
  let modulesRestaures = 0
  if (coupleComplet) {
    const ordre = (await getEffectiveModules()).map(m => m.slug)
    for (const m of donnees.modules) {
      const mod = moduleDe.get(m.slug)
      if (!mod || mod.revealed) continue
      if (m.revealed) {
        await admin.from('modules').update({
          statut: 'complete', revealed: true, reponses_partagees: true, revealed_at: new Date().toISOString(),
        }).eq('id', mod.id)
        mod.revealed = true
        mod.statut = 'complete'
        modulesRestaures++
      } else if (m.statut !== 'locked' && mod.statut === 'locked') {
        await admin.from('modules').update({ statut: 'en_cours' }).eq('id', mod.id)
        mod.statut = 'en_cours'
      }
    }
    // Ouvre le module qui suit le dernier module révélé (sauf le rendez-vous
    // annuel, qui s'ouvre à sa date).
    const dernierRevele = ordre.reduce((acc, slug, i) => (moduleDe.get(slug)?.revealed ? i : acc), -1)
    const suivant = ordre[dernierRevele + 1]
    if (suivant && suivant !== MODULE_RDV_ANNUEL && moduleDe.get(suivant)?.statut === 'locked') {
      await admin.from('modules').update({ statut: 'en_cours' }).eq('couple_id', coupleId).eq('slug', suivant).eq('statut', 'locked')
    }
  }

  // Couple : on complète les champs vides.
  const { data: couple } = await admin.from('couples').select('nom_couple, date_anniversaire, pacte_texte').eq('id', coupleId).single()
  const champs: Record<string, string> = {}
  if (!couple?.nom_couple && donnees.couple.nom_couple) champs.nom_couple = donnees.couple.nom_couple
  if (!couple?.date_anniversaire && donnees.couple.date_anniversaire) champs.date_anniversaire = donnees.couple.date_anniversaire
  if (coupleComplet && !couple?.pacte_texte?.trim() && donnees.couple.pacte_texte?.trim()) champs.pacte_texte = donnees.couple.pacte_texte
  if (Object.keys(champs).length) await admin.from('couples').update(champs).eq('id', coupleId)
  if (coupleComplet && donnees.couple.pacte_signe_le) {
    // Colonnes de signature : ignorées si elles n'existent pas encore en base.
    const { data: sig } = await admin.from('couples').select('pacte_signe_le').eq('id', coupleId).maybeSingle()
    if (sig && !sig.pacte_signe_le) {
      await admin.from('couples').update({ pacte_signe_le: donnees.couple.pacte_signe_le, rdv_annuel_le: donnees.couple.rdv_annuel_le }).eq('id', coupleId)
    }
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath('/journal')
  revalidatePath('/pacte')
  return {
    success: true as const,
    reponses: reponsesAAjouter.length,
    conclusions: journalAAjouter.length,
    modulesReveles: modulesRestaures,
    partenaireManquant: !coupleComplet && donnees.membres.length >= 2,
  }
}
