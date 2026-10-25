'use client'

import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'
import { Check, ArrowRight } from 'lucide-react'

// Les trois offres (module 1 gratuit, pack initial à 58 €, abonnement
// annuel facultatif à 19 €/an pour le rendez-vous annuel), affichées à l'identique sur l'accueil et sur /tarifs.
// Identifiants de texte partagés (offres.*) : une modification en mode
// édition s'applique aux deux pages.

const DECOUVERTE = [
  'Module "Toi et Moi" pour vous deux',
  'Questions personnelles',
  'Espace couple privé',
]
const ACCES_COMPLET = [
  'Les 8 modules du pack initial',
  'Accès à vos réponses individuelles et révélations de couple',
  'Votre journal de couple',
  'La signature du pacte de couple',
]
const BAC = [
  'Le module « Notre rendez-vous annuel » à la date que vous avez choisie',
  'Un e-mail 2 mois avant votre date pour vous le rappeler',
  'Refaites tous les modules du parcours initial si vous le souhaitez',
  'Annulable à tout moment',
]

function Avantages({ prefixe, items, couleurCoche, couleurTexte }: { prefixe: string; items: string[]; couleurCoche: string; couleurTexte: string }) {
  return (
    <>
      {items.map((texte, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: couleurCoche }} />
          <span style={{ fontSize: 13.5, color: couleurTexte }}><EditableText id={`${prefixe}.${i}`}>{texte}</EditableText></span>
        </div>
      ))}
    </>
  )
}

export default function OffresTarifs({ onInscription }: { onInscription: () => void }) {
  const t = useT()
  return (
    <>
    <div className="grid md:grid-cols-3 gap-5">
      {/* Découverte */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="tag-muted self-start"><EditableText id="offres.decouverte.tag">Découverte</EditableText></div>
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 40, color: 'var(--ink)' }}>0 <small style={{ fontSize: 20 }}>€</small></div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="offres.decouverte.desc">Module 1 gratuit · pour vous deux · jusqu&apos;à la révélation</EditableText></div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
        <Avantages prefixe="offres.decouverte.avantages" items={DECOUVERTE} couleurCoche="var(--sage)" couleurTexte="var(--ink-2)" />
        <button onClick={onInscription} className="btn-ghost justify-center mt-auto">
          <EditableText id="offres.decouverte.cta">Commencer gratuitement</EditableText>
        </button>
      </div>

      {/* Accès complet */}
      <div className="card p-6 flex flex-col gap-4" style={{ background: 'var(--brand)', border: 'none' }}>
        <div className="self-start px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
          <EditableText id="offres.complet.tag.v3">Pack initial</EditableText>
        </div>
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 40, color: 'white' }}>58 <small style={{ fontSize: 20 }}>€</small></div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}><EditableText id="offres.complet.desc.v3">paiement unique · 1 an pour réaliser votre parcours</EditableText></div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)' }} />
        <Avantages prefixe="offres.complet.avantages.v4" items={ACCES_COMPLET} couleurCoche="rgba(255,255,255,.8)" couleurTexte="rgba(255,255,255,.9)" />
        <button onClick={onInscription} className="mt-auto flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg" style={{ background: 'white', color: 'var(--brand)', fontSize: 14 }}>
          <EditableText id="offres.complet.cta">Je m&apos;inscris</EditableText> <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Rendez-vous annuel */}
      <div className="card p-6 flex flex-col gap-4">
        <div className="tag-brand self-start"><EditableText id="offres.bac.tag">Votre rendez-vous annuel</EditableText></div>
        <div>
          <div className="font-serif font-bold" style={{ fontSize: 40, color: 'var(--ink)' }}>19 <small style={{ fontSize: 20 }}>{t('€/an', '€/year')}</small></div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="offres.bac.desc.v4">Facultatif · pour le module de renouvellement à votre date</EditableText></div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
        <Avantages prefixe="offres.bac.avantages.v3" items={BAC} couleurCoche="var(--sage)" couleurTexte="var(--ink-2)" />
        <button onClick={onInscription} className="btn-ghost justify-center mt-auto">
          <EditableText id="offres.bac.cta">Plus tard, dans l&apos;app</EditableText>
        </button>
      </div>
    </div>
      <p className="text-center mt-4" style={{ fontSize: 12, color: 'var(--muted)' }}>
        {t('Prix par couple, en euros · TVA non applicable, art. 293 B du CGI', 'Prices per couple, in euros · VAT not applicable, art. 293 B of the French tax code')}
      </p>
    </>
  )
}
