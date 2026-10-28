import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarHeart, Lock, MessageCircleHeart, Sprout } from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getLocale, getT } from '@/lib/i18n/server'
import { MODULE_RDV_ANNUEL, ouvrirRdvAnnuelSiDate } from '@/lib/progression'
import { moisDepuis, questionDuMois } from '@/lib/rappels-email'
import { dechiffrerLignes } from '@/lib/chiffrement'
import EditableText from '@/components/edit-mode/EditableText'
import ReponseMois from './ReponseMois'

export const metadata = { title: 'Nos rendez-vous annuels' }

// Nos rendez-vous annuels : une fois le pacte signé, la question de chaque
// mois (celle de l'e-mail mensuel) avec les réponses des deux membres du
// couple, dévoilées quand les deux ont répondu, et le bilan annuel (module « Notre rendez-vous annuel »).
export default async function RdvAnnuelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')
  const { data: profile } = await supabase.from('profiles').select('couple_id').eq('id', user.id).single()
  if (!profile?.couple_id) redirect('/tableau-de-bord')

  const locale = await getLocale()
  const t = getT(locale)
  const admin = createAdminClient()
  await ouvrirRdvAnnuelSiDate(admin, profile.couple_id)

  const [{ data: couple }, { data: membres }, { data: moduleRdv }, { data: reponsesBrutes }] = await Promise.all([
    supabase.from('couples').select('pacte_signe_le, rdv_annuel_le').eq('id', profile.couple_id).single(),
    supabase.from('profiles').select('id, prenom').eq('couple_id', profile.couple_id),
    supabase.from('modules').select('statut, revealed, revealed_at').eq('couple_id', profile.couple_id).eq('slug', MODULE_RDV_ANNUEL).maybeSingle(),
    admin.from('rdv_reponses_mois').select('user_id, mois, valeur').eq('couple_id', profile.couple_id),
  ])
  const reponses = dechiffrerLignes(reponsesBrutes)

  const pacteSigne = !!couple?.pacte_signe_le
  const moisEcoules = pacteSigne ? moisDepuis(new Date(couple!.pacte_signe_le as string), new Date()) : 0
  const moi = (membres ?? []).find(m => m.id === user.id)
  const autre = (membres ?? []).find(m => m.id !== user.id)
  const dateFr = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
  const moisFr = (mois: number) => {
    const d = new Date(couple!.pacte_signe_le as string)
    d.setUTCMonth(d.getUTCMonth() + mois)
    const libelle = d.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
    return libelle.charAt(0).toUpperCase() + libelle.slice(1)
  }
  const reponseDe = (userId: string | undefined, mois: number) => reponses.find(r => r.user_id === userId && r.mois === mois)?.valeur ?? ''

  const rdvOuvert = !!moduleRdv && (moduleRdv.statut !== 'locked' || moduleRdv.revealed)
  const listeMois = Array.from({ length: moisEcoules }, (_, i) => moisEcoules - i)

  return (
    <div className="fade" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-tint)' }}>
          <CalendarHeart className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}><EditableText id="rdvannuels.titre">Nos rendez-vous annuels</EditableText></h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id="rdvannuels.soustitre" multiline>Chaque mois, une question pour faire vivre votre pacte, et chaque année, votre bilan de couple.</EditableText></p>
        </div>
      </div>

      {!pacteSigne ? (
        <div className="card p-5 flex items-center gap-3" style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand-soft)' }}>
          <Sprout className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
            <EditableText id="rdvannuels.attente" multiline>Cette page s’ouvrira une fois votre pacte signé : chaque mois, vous y noterez vos réponses à la question du mois, et chaque année, vous y ferez votre bilan de couple lors de votre rendez-vous annuel.</EditableText>
          </p>
        </div>
      ) : (
        <>
          {/* Bilan annuel */}
          <div className="card p-6 mb-8" style={{ background: 'linear-gradient(120deg, var(--brand-tint), var(--paper))' }}>
            <p className="font-mono text-xs font-bold mb-2" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}>{t('NOTRE BILAN ANNUEL', 'OUR YEARLY REVIEW')}</p>
            {moduleRdv?.revealed ? (
              <>
                <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginBottom: 12 }}>
                  {t(`Votre bilan annuel est fait${moduleRdv.revealed_at ? ` (le ${dateFr(moduleRdv.revealed_at)})` : ''} : relisez-le ensemble quand vous le souhaitez.`, `Your yearly review is done${moduleRdv.revealed_at ? ` (on ${dateFr(moduleRdv.revealed_at)})` : ''}: reread it together whenever you like.`)}
                </p>
                <Link href={`/module/${MODULE_RDV_ANNUEL}/revelation`} className="btn-brand text-sm py-2">{t('Relire notre bilan', 'Reread our review')}</Link>
              </>
            ) : rdvOuvert ? (
              <>
                <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginBottom: 12 }}>
                  {t('C’est le moment de votre rendez-vous annuel ! Chacun·e répond de son côté : ce qui a marché, ce qui a été dur, ce que vous voulez pour la suite. Vos réponses du mois, ci-dessous, peuvent vous y aider.', 'It’s time for your yearly date! Each of you answers on your own: what worked, what was hard, what you want next. Your monthly answers below can help.')}
                </p>
                <Link href={`/module/${MODULE_RDV_ANNUEL}`} className="btn-brand text-sm py-2">{t('Faire notre bilan annuel', 'Do our yearly review')}</Link>
              </>
            ) : (
              <p style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>
                {couple?.rdv_annuel_le
                  ? t(`Votre rendez-vous annuel est fixé au ${dateFr(couple.rdv_annuel_le)}. Ce jour-là, le bilan de votre année s’ouvrira ici : ce qui a marché, ce qui a été dur, ce que vous voulez pour la suite.`, `Your yearly date is set for ${dateFr(couple.rdv_annuel_le)}. On that day, the review of your year will open here: what worked, what was hard, what you want next.`)
                  : t('Le bilan de votre année s’ouvrira ici à la date de votre rendez-vous annuel.', 'The review of your year will open here on the date of your yearly date.')}
              </p>
            )}
          </div>

          {/* Questions du mois */}
          <div className="flex items-center gap-2 mb-4">
            <MessageCircleHeart className="w-5 h-5" style={{ color: 'var(--brand)' }} />
            <h2 className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>{t('Nos questions du mois', 'Our monthly questions')}</h2>
          </div>
          {listeMois.length === 0 ? (
            <div className="card p-5">
              <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                {t(`Votre première question arrivera par e-mail un mois après la signature de votre pacte (en ${moisFr(1).toLowerCase()}) : vous noterez vos réponses ici.`, `Your first question will arrive by email one month after signing your pact (in ${moisFr(1)}): you’ll note your answers here.`)}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {listeMois.map(mois => {
                const { titre, question } = questionDuMois(mois, locale)
                // Comme pour les modules : la réponse de l'autre reste cachée
                // tant que les deux n'ont pas répondu (et n'est pas envoyée
                // au navigateur), puis les deux sont dévoilées.
                const maReponse = reponseDe(user.id, mois)
                const saReponse = reponseDe(autre?.id, mois)
                const devoilee = !!maReponse.trim() && !!saReponse.trim()
                const nomAutre = autre?.prenom || t('L’autre membre du couple', 'The other member of the couple')
                return (
                  <div key={mois} id={`mois-${mois}`} className="card p-5" style={{ scrollMarginTop: 96 }}>
                    <p className="font-mono text-xs mb-1" style={{ color: 'var(--muted)', letterSpacing: '.08em' }}>
                      {moisFr(mois).toUpperCase()} · {t(`MOIS ${mois}`, `MONTH ${mois}`)}
                    </p>
                    <p className="font-semibold" style={{ fontSize: 13.5, color: 'var(--brand)' }}>{titre}</p>
                    <p className="font-serif mb-4" style={{ fontSize: 17, color: 'var(--ink)', lineHeight: 1.4 }}>{question}</p>
                    <ReponseMois mois={mois} prenom={moi?.prenom || t('Moi', 'Me')} initiale={maReponse} />
                    {autre && (
                      <div className="mt-3">
                        <p className="label">{nomAutre}</p>
                        {devoilee ? (
                          <p style={{ fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{saReponse}</p>
                        ) : (
                          <p className="flex items-center gap-1.5" style={{ fontSize: 14, color: 'var(--muted-2)', fontStyle: 'italic' }}>
                            <Lock className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                            {saReponse.trim()
                              ? t('A déjà répondu. Sa réponse sera dévoilée dès que tu auras enregistré la tienne.', 'Has already answered. Their answer will be revealed as soon as you save yours.')
                              : maReponse.trim()
                              ? t('Pas encore de réponse. Vos deux réponses seront dévoilées dès que vous aurez répondu tous les deux.', 'No answer yet. Both answers will be revealed once you have both answered.')
                              : t('Vos deux réponses seront dévoilées dès que vous aurez répondu tous les deux.', 'Both answers will be revealed once you have both answered.')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
