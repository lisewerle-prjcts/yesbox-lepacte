'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import type { Question } from '@/types'

export async function updateMesInfos(nom: string, prenom: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!prenom.trim()) return { error: 'Le prénom est requis' }

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!prenom.trim()) return { error: 'Le prénom est requis' }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: 'Aucun couple trouvé' }

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: 'Aucun couple trouvé' }

  const { error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: myProfile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!myProfile?.couple_id) return { error: 'Aucun couple trouvé' }

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Non authentifié' }
  if (newPassword.length < 8) return { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) return { error: 'Mot de passe actuel incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }

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

export async function exporterMesReponses(): Promise<{ error: string } | { success: true; filename: string; content: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) return { error: 'Aucun couple trouvé' }

  const [{ data: couple }, { data: members }, { data: modules }, { data: journal }, effectiveModules] = await Promise.all([
    supabase.from('couples').select('numero, nom_couple').eq('id', profile.couple_id).single(),
    supabase.from('profiles').select('id, prenom, nom, email').eq('couple_id', profile.couple_id),
    supabase.from('modules').select('id, slug').eq('couple_id', profile.couple_id),
    supabase.from('journal_entries').select('module_slug, contenu').eq('couple_id', profile.couple_id),
    getEffectiveModules(),
  ])

  const moduleIds = (modules || []).map(m => m.id)
  const { data: reponses } = moduleIds.length
    ? await supabase.from('reponses').select('module_id, user_id, question_slug, valeur').in('module_id', moduleIds)
    : { data: [] }

  const membersList = members || []

  const lines: string[] = []
  lines.push('YES BOX — Le Pacte — Mes réponses')
  if (couple?.nom_couple) lines.push(couple.nom_couple)
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
    filename: `yesbox-mes-reponses${couple?.numero ? `-${couple.numero}` : ''}.txt`,
    content: lines.join('\n'),
  }
}

export async function supprimerMonCompte() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('couple_id').eq('id', user.id).single()
  const coupleId = profile?.couple_id

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  if (coupleId) {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('couple_id', coupleId)
    if (!count) await admin.from('couples').delete().eq('id', coupleId)
  }

  return { success: true }
}
