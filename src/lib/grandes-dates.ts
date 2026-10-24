import { createAdminClient } from '@/lib/supabase/server'
import { envoyerMail } from '@/lib/mailer'
import { getProchainAnniversaire } from '@/lib/anniversaires'

type AdminClient = ReturnType<typeof createAdminClient>

// « Nos grandes dates » du couple (tableau de bord) : date de rencontre
// (couples.date_anniversaire) et date de mariage (couples.date_mariage).
export type TypeGrandeDate = 'rencontre' | 'mariage'

export const LIBELLES_GRANDE_DATE: Record<TypeGrandeDate, string> = {
  rencontre: 'Anniversaire de rencontre',
  mariage: 'Anniversaire de mariage',
}

export interface ProchaineGrandeDate {
  type: TypeGrandeDate
  // Date d'origine (AAAA-MM-JJ).
  origine: string
  // Prochain anniversaire de cette date.
  le: Date
  annees: number
  joursAvant: number
}

const JOUR = 24 * 60 * 60 * 1000
// L'équipe est prévenue un mois avant chaque anniversaire.
export const ALERTE_JOURS_AVANT = 30

export function prochainesGrandesDates(couple: { date_anniversaire: string | null; date_mariage?: string | null }): ProchaineGrandeDate[] {
  const now = new Date()
  const aujourdhui = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dates: [TypeGrandeDate, string | null | undefined][] = [['rencontre', couple.date_anniversaire], ['mariage', couple.date_mariage]]
  const resultat: ProchaineGrandeDate[] = []
  for (const [type, origine] of dates) {
    if (!origine) continue
    const prochain = getProchainAnniversaire(origine)
    if (!prochain) continue
    resultat.push({
      type,
      origine,
      le: prochain.date,
      annees: prochain.years,
      joursAvant: Math.round((prochain.date.getTime() - aujourdhui.getTime()) / JOUR),
    })
  }
  return resultat.sort((a, b) => a.le.getTime() - b.le.getTime())
}

function echapper(texte: string) {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const formater = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Tâche planifiée quotidienne : un e-mail à l'équipe pour chaque anniversaire
// (rencontre ou mariage) qui tombe dans les 30 prochains jours, une seule
// fois par anniversaire (rappels_envoyes) ; un jour de tâche manqué est
// rattrapé le lendemain.
export async function envoyerAlertesGrandesDates(admin: AdminClient): Promise<number> {
  const destinataire = process.env.ADMIN_NOTIF_EMAIL || 'lise.yesbox@gmail.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yesbox-lepacte.vercel.app'

  const { data: couples, error } = await admin
    .from('couples')
    .select('id, numero, nom_couple, date_anniversaire, date_mariage')
    .or('date_anniversaire.not.is.null,date_mariage.not.is.null')
  if (error) throw new Error(error.message)

  let envoyes = 0
  for (const couple of couples ?? []) {
    try {
      const aVenir = prochainesGrandesDates(couple).filter(d => d.joursAvant > 0 && d.joursAvant <= ALERTE_JOURS_AVANT)
      if (!aVenir.length) continue

      const { data: membres } = await admin.from('profiles').select('prenom, email').eq('couple_id', couple.id)
      const nomMembres = (membres ?? []).map(m => m.prenom || m.email).join(' & ') || '—'

      for (const d of aVenir) {
        const anniversaire = `${d.le.getFullYear()}-${String(d.le.getMonth() + 1).padStart(2, '0')}-${String(d.le.getDate()).padStart(2, '0')}`
        const { data: reserve, error: reserveError } = await admin
          .from('rappels_envoyes')
          .upsert({ couple_id: couple.id, type: 'alerte_grande_date', cle: `${d.type}:${anniversaire}` }, { onConflict: 'couple_id,type,cle', ignoreDuplicates: true })
          .select('couple_id')
        if (reserveError) throw new Error(reserveError.message)
        if (!reserve?.length) continue

        const libelle = LIBELLES_GRANDE_DATE[d.type]
        const ok = await envoyerMail({
          nom: 'YES BOX Grandes dates',
          to: destinataire,
          subject: `${libelle} dans ${d.joursAvant} jours : Couple ${couple.numero} (${d.annees} an${d.annees > 1 ? 's' : ''})`,
          body: `
            <p>Une grande date approche pour un couple YES BOX.</p>
            <p><strong>Couple :</strong> ${couple.numero}${couple.nom_couple ? ` — ${echapper(couple.nom_couple)}` : ''}<br><strong>Membres :</strong> ${echapper(nomMembres)}<br><strong>${libelle} :</strong> ${formater(d.le)} (${d.annees} an${d.annees > 1 ? 's' : ''}, date d'origine : ${formater(new Date(d.origine))})</p>
            <p><a href="${appUrl}/admin/couples">Voir les couples dans l'admin</a></p>
          `,
        })
        if (ok) envoyes++
      }
    } catch (e) {
      console.error(`[grandes-dates] couple ${couple.id} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return envoyes
}
