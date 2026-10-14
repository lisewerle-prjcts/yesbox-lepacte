import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getEffectiveModules } from '@/lib/modules-effective'
import { getInviteLink } from '@/app/actions/couple'
import { getLocale, getT } from '@/lib/i18n/server'
import { localizeModule, localizeModules } from '@/lib/i18n/module-text'
import { MODULES } from '@/lib/modules-data'
import EditableText from '@/components/edit-mode/EditableText'
import VotreCoupleCard from '@/components/dashboard/VotreCoupleCard'
import type { CoupleAbonnement, Module } from '@/types'
import { ABONNEMENT_COLONNES } from '@/types'
import { peutAccederModule, estCompteResilie } from '@/lib/abonnement'
import { realignerProgression, ouvrirRdvAnnuelSiDate, MODULE_PACTE, MODULE_RDV_ANNUEL } from '@/lib/progression'
import { hasAnsweredAll } from '@/lib/questions'
import { ArrowRight, CalendarHeart } from 'lucide-react'
import { creerCoupleSolo } from '@/lib/couple-join'
import { envoyerBienvenueSiEnAttente } from '@/lib/welcome-email'
import { dechiffrerLignes } from '@/lib/chiffrement'

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: Promise<{ code_error?: string }>
}) {
  const { code_error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Compte sans couple (création ratée à l'inscription, ou personne retirée
  // de son couple depuis l'admin) : on lui crée son espace, comme à
  // l'inscription, pour qu'elle puisse commencer à répondre seule.
  if (profile && !profile.couple_id) {
    const res = await creerCoupleSolo(user.id)
    if (res.success) {
      await envoyerBienvenueSiEnAttente(user.id)
      ;({ data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single())
    }
  }

  let modules: Module[] = []
  let partner: { prenom: string | null; email: string; id: string } | null = null
  let couple: { nom_couple: string | null; date_anniversaire: string | null } | null = null
  let signature: { pacte_signe_le: string | null; rdv_annuel_le: string | null } | null = null
  let coupleAbonnement: CoupleAbonnement | null = null
  let reponses: { module_id: string; user_id: string; question_slug: string; valeur: string | null }[] = []

  if (profile?.couple_id) {
    const [{ data: mods }, { data: part }, { data: coup }, { data: coupAbo }, { data: sig }] = await Promise.all([
      supabase.from('modules').select('*').eq('couple_id', profile.couple_id).order('created_at'),
      supabase.from('profiles').select('prenom, email, id').eq('couple_id', profile.couple_id).neq('id', user.id).single(),
      supabase.from('couples').select('nom_couple, date_anniversaire').eq('id', profile.couple_id).single(),
      supabase.from('couples').select(ABONNEMENT_COLONNES).eq('id', profile.couple_id).single(),
      // Requête à part : si les colonnes de signature manquent en base, le reste s'affiche.
      supabase.from('couples').select('pacte_signe_le, rdv_annuel_le').eq('id', profile.couple_id).maybeSingle(),
    ])
    signature = sig
    modules = mods || []
    partner = part
    couple = coup
    coupleAbonnement = coupAbo

    const admin = createAdminClient()
    const resilie = estCompteResilie(coupleAbonnement)
    const realigne = await realignerProgression(admin, profile.couple_id, undefined, { ouvrir: !resilie })
    const rdvOuvert = !resilie && (await ouvrirRdvAnnuelSiDate(admin, profile.couple_id))
    const ouvert = realigne || rdvOuvert
    if (ouvert) {
      const { data: modsOuverts } = await supabase.from('modules').select('*').eq('couple_id', profile.couple_id).order('created_at')
      modules = modsOuverts || []
    }

    // Lu côté serveur (service role) uniquement pour calculer l'avancement de
    // chacun·e : aucune réponse n'est envoyée au navigateur depuis cette page.
    const { data: reps } = await createAdminClient()
      .from('reponses')
      .select('module_id, user_id, question_slug, valeur')
      .in('module_id', modules.map(m => m.id))
    reponses = dechiffrerLignes(reps)
  }

  const locale = await getLocale()
  const t = getT(locale)
  const inviteData = await getInviteLink()
  const effectiveModules = localizeModules(await getEffectiveModules(), locale)
  const totalModuleCount = effectiveModules.length

  const done = modules.filter(m => m.revealed).length
  const pct = totalModuleCount ? Math.round((done / totalModuleCount) * 100) : 0
  // Le pacte se signe dès la fin du module 9 (le module 10 vient un an plus tard).
  const pacteASigner = modules.some(m => m.slug === MODULE_PACTE && m.revealed)
  const pacteSigne = !!signature?.pacte_signe_le
  const rdvLe = pacteSigne ? signature?.rdv_annuel_le ?? null : null
  const rdvVerrouille = modules.find(m => m.slug === MODULE_RDV_ANNUEL)?.statut === 'locked'

  function getModStatus(slug: string): 'done' | 'active' | 'paywall' | 'locked' {
    const mod = modules.find(m => m.slug === slug)
    if (!mod) return 'locked'
    if (mod.revealed) return 'done'
    // statut === 'complete' veut seulement dire que l'un·e des deux a fini de
    // répondre : tant que la révélation n'a pas eu lieu, ce n'est pas "done".
    if (mod.statut === 'complete' || mod.statut === 'en_cours') return 'active'
    return 'locked'
  }

  return (
    <div className="fade" style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {couple?.nom_couple
            ? <><EditableText id="dashboard.bonjour.avecnom">Bonjour,</EditableText> <span style={{ color: 'var(--brand)' }}>{couple.nom_couple}</span></>
            : <><EditableText id="dashboard.bonjour.sansnom">Bonjour</EditableText>{profile?.prenom ? `, ${profile.prenom}` : ''}</>}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {partner
            ? <><EditableText id="dashboard.souscritre.avecpartenaire">Tu construis ce pacte avec</EditableText> {partner.prenom || partner.email}</>
            : <EditableText id="dashboard.souscritre.invite">Invite ton/ta partenaire pour commencer le voyage ensemble</EditableText>}
        </p>
      </div>

      {profile?.couple_id && (
        <VotreCoupleCard
          hasPartner={!!partner}
          partnerPrenom={partner?.prenom ?? ''}
          dateAnniversaire={couple?.date_anniversaire ?? ''}
          pairingCode={inviteData.success ? inviteData.pairingCode ?? null : null}
          inviteLink={inviteData.success ? inviteData.link ?? null : null}
          initialCodeError={code_error}
        />
      )}

      {/* Progression */}
      {profile?.couple_id && (
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 style={{ fontFamily: 'var(--font-newsreader)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}><EditableText id="dashboard.progression.titre">Votre progression</EditableText></h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{t(`${done} module${done > 1 ? 's' : ''} révélé${done > 1 ? 's' : ''} sur ${totalModuleCount}`, `${done} module${done > 1 ? 's' : ''} revealed out of ${totalModuleCount}`)}</p>
            </div>
            <span className="font-serif font-bold" style={{ fontSize: 28, color: pct === 100 ? 'var(--sage)' : 'var(--brand)' }}>{pct}%</span>
          </div>
          <div className="bar sage"><i style={{ width: `${pct}%` }} /></div>
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="text-sm font-semibold" style={{ color: pacteASigner ? 'var(--sage)' : 'var(--muted)' }}>
              {pacteSigne
                ? <EditableText id="dashboard.progression.signe">🎉 Votre pacte est signé !</EditableText>
                : pacteASigner
                ? <EditableText id="dashboard.progression.complete">🎉 Votre pacte est prêt à être signé !</EditableText>
                : <EditableText id="dashboard.progression.encours">Voir le détail de votre progression</EditableText>}
            </span>
            <Link href="/pacte" className={pacteASigner ? 'btn-sage text-sm py-2' : 'btn-secondary text-sm py-2'}><EditableText id="dashboard.progression.voirpacte">Voir la progression</EditableText></Link>
          </div>
        </div>
      )}

      {/* Date du bilan annuel, choisie à la signature du pacte (tant que le module 10 n'est pas ouvert) */}
      {profile?.couple_id && rdvLe && rdvVerrouille && (
        <div className="card p-5 mb-6 flex flex-wrap items-center gap-4" style={{ background: `linear-gradient(120deg, var(--brand-tint), var(--paper))` }}>
          <CalendarHeart className="w-8 h-8" style={{ color: 'var(--brand)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="font-mono text-xs font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}><EditableText id="dashboard.rdv.label">VOTRE BILAN ANNUEL DE COUPLE</EditableText></p>
            <p className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>
              {new Date(`${rdvLe}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id="pacte.rdv.attente" multiline>Le module « Notre rendez-vous annuel » se débloquera à cette date.</EditableText></p>
          </div>
          <Link href="/journal" className="btn-secondary text-sm py-2"><EditableText id="dashboard.rdv.voirpacte">Voir notre pacte</EditableText></Link>
        </div>
      )}

      {/* Prochaine étape */}
      {profile?.couple_id && (() => {
        const nextIdx = effectiveModules.findIndex(m => getModStatus(m.slug) === 'active')
        if (nextIdx === -1) return null
        const next = effectiveModules[nextIdx]
        const titre = next.titre
        // Même description que sur la page d'accueil (texte de référence du
        // module de base), pour ne pas afficher une ancienne version.
        const moduleBase = MODULES.find(m => m.slug === next.slug)
        const description = moduleBase ? localizeModule(moduleBase, locale).description : next.description

        const nextModData = modules.find(m => m.slug === next.slug)
        const mesReponses = nextModData ? reponses.filter(r => r.module_id === nextModData.id && r.user_id === user.id) : []
        const sesReponses = nextModData && partner ? reponses.filter(r => r.module_id === nextModData.id && r.user_id === partner!.id) : []
        const monCompte = mesReponses.length
        // Réponses déjà partagées : le module est fini pour les deux, même si une
        // question a été ajoutée depuis.
        const reponsesVerrouillees = !!(nextModData?.reponses_partagees || nextModData?.revealed)
        const jaiFini = reponsesVerrouillees || hasAnsweredAll(next.questions, mesReponses)
        const partenaireFini = reponsesVerrouillees || hasAnsweredAll(next.questions, sesReponses)
        const enAttentePartenaire = jaiFini && !partenaireFini

        // Dès que j'ai fini, "voir"/"ouvrir la révélation" pointent vers la page de
        // révélation (aperçu de mes réponses tant que l'autre n'a pas terminé ; les
        // deux réponses une fois que c'est le cas).
        const href = jaiFini ? `/module/${next.slug}/revelation` : `/module/${next.slug}`

        // Module payant sans abonnement actif (ex. juste après le module 1
        // gratuit) : on propose l'abonnement plutôt que d'ouvrir le module.
        const abonnementRequis = !peutAccederModule(next, nextModData, coupleAbonnement)

        return (
          <div className="card p-5 mb-6 flex flex-wrap items-center gap-4" style={{ background: `linear-gradient(120deg, var(--brand-tint), var(--paper))` }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="font-mono text-xs font-bold mb-1" style={{ color: 'var(--brand)', letterSpacing: '.1em' }}><EditableText id="dashboard.prochaineetape.label">PROCHAINE ÉTAPE</EditableText> · MODULE {String(nextIdx + 1).padStart(2, '0')}</p>
              <p className="font-serif font-bold" style={{ fontSize: 20, color: 'var(--ink)' }}>{titre}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id={`module.${next.slug}.description`} multiline>{description}</EditableText></p>
            </div>
            <Link href={abonnementRequis ? '/abonnement' : href} className="btn-brand">
              {abonnementRequis
                ? <EditableText id="dashboard.prochaineetape.abonnement">S&apos;abonner pour continuer</EditableText>
                : partenaireFini
                ? <EditableText id="dashboard.prochaineetape.ouvrirrevelation">Ouvrir la révélation</EditableText>
                : enAttentePartenaire
                ? <EditableText id="dashboard.prochaineetape.voir">Voir</EditableText>
                : monCompte > 0
                ? <EditableText id="dashboard.prochaineetape.continuer">Continuer</EditableText>
                : <EditableText id="dashboard.prochaineetape.commencer">Commencer</EditableText>}
              {' '}<ArrowRight className="w-4 h-4" style={{ display: 'inline' }} />
            </Link>
          </div>
        )
      })()}
    </div>
  )
}
