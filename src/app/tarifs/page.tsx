'use client'

import { useState } from 'react'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import PrecommandeModal from '@/components/PrecommandeModal'
import EditableText from '@/components/edit-mode/EditableText'
import { Check, ArrowRight } from 'lucide-react'

const FREE_FEATURES = ['Module "Moi et toi" pour chaque membre du couple', '5 questions introspectives', 'Espace couple privé', 'Aucune carte bancaire requise']
const PRO_FEATURES = ['Les 7 modules complets', 'Sessions de révélation à deux', 'Score de connivence & journal', 'Votre CDD de couple personnalisé']
const BAC_FEATURES = ['Rappel annuel à votre date anniversaire', 'Fiche avenant générée', 'Refaites tous les modules si vous voulez recommencer', 'Nouvelles questions chaque année', 'Annulable à tout moment']

export default function TarifsPage() {
  const [modal, setModal] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ borderBottom: '1px solid var(--line)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1080, margin: '0 auto' }}>
        <YesBoxLogo size="sm" />
        <Link href="/connexion" className="btn-ghost text-sm py-2"><EditableText id="tarifs.nav.seconnecter">Se connecter</EditableText></Link>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 80px' }}>
        <div className="text-center mb-12">
          <div className="eyebrow justify-center mb-3"><EditableText id="tarifs.eyebrow">Tarifs</EditableText></div>
          <h1 className="font-serif" style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
            <EditableText id="tarifs.title">Un abonnement simple. Une vie de rendez-vous.</EditableText>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            <EditableText id="tarifs.subtitle.prefix">Le module 1 est gratuit pour vous deux, jusqu&apos;à la révélation. Lancement le</EditableText>{' '}
            <strong style={{ color: 'var(--ink)' }}><EditableText id="tarifs.subtitle.date">1er septembre 2026</EditableText></strong>.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {/* Gratuit */}
          <div className="card p-6 flex flex-col gap-4">
            <div className="tag-muted self-start"><EditableText id="tarifs.free.tag">Découverte</EditableText></div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 40, color: 'var(--ink)' }}>0 <small style={{ fontSize: 20 }}>€</small></div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="tarifs.free.desc">Module 1 gratuit · pour vous deux · jusqu&apos;à la révélation</EditableText></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            {FREE_FEATURES.map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><EditableText id={`tarifs.free.features.${i}`}>{t}</EditableText></span>
              </div>
            ))}
            <Link href="/inscription" className="btn-ghost justify-center mt-auto"><EditableText id="tarifs.free.cta">Commencer gratuitement</EditableText></Link>
          </div>

          {/* Abonnement mensuel */}
          <div className="card p-6 flex flex-col gap-4" style={{ background: 'var(--brand)', border: 'none', transform: 'scale(1.02)' }}>
            <div className="self-start px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
              ⭐ <EditableText id="tarifs.pro.tag">Recommandé</EditableText>
            </div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 40, color: 'white' }}>29 <small style={{ fontSize: 20 }}>€/mois</small></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}><EditableText id="tarifs.pro.desc">abonnement · résiliable à tout moment</EditableText></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)' }} />
            {PRO_FEATURES.map((f, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.8)' }} />
                <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.9)' }}><EditableText id={`tarifs.pro.features.${i}`}>{f}</EditableText></span>
              </div>
            ))}
            <button onClick={() => setModal(true)} className="mt-auto flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg" style={{ background: 'white', color: 'var(--brand)', fontSize: 14 }}>
              <EditableText id="tarifs.pro.cta">Pré-commander</EditableText> <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center" style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}><EditableText id="tarifs.pro.footnote">Aucun paiement maintenant · au lancement</EditableText></p>
          </div>

          {/* BAC annuel */}
          <div className="card p-6 flex flex-col gap-4">
            <div className="tag-brand self-start"><EditableText id="tarifs.bac.tag">BAC annuel</EditableText></div>
            <div>
              <div className="font-serif font-bold" style={{ fontSize: 40, color: 'var(--ink)' }}>19 <small style={{ fontSize: 20 }}>€/an</small></div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="tarifs.bac.desc">Bilan Annuel de Couple · à activer plus tard</EditableText></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
            {BAC_FEATURES.map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><EditableText id={`tarifs.bac.features.${i}`}>{t}</EditableText></span>
              </div>
            ))}
            <Link href="/inscription" className="btn-ghost justify-center mt-auto"><EditableText id="tarifs.bac.cta">Plus tard, dans l&apos;app</EditableText></Link>
          </div>
        </div>

        <p className="text-center mt-8" style={{ fontSize: 12, color: 'var(--muted)' }}>
          <EditableText id="tarifs.footer.prefix">Détail des abonnements, résiliation et règles du jeu :</EditableText>{' '}
          <Link href="/mentions-legales" style={{ color: 'var(--brand)' }}><EditableText id="tarifs.footer.link">conditions d&apos;utilisation</EditableText></Link>.
        </p>
      </main>

      {modal && <PrecommandeModal onClose={() => setModal(false)} />}
    </div>
  )
}
