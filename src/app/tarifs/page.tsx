'use client'

import { useState } from 'react'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import InscriptionModal from '@/components/InscriptionModal'
import OffresTarifs from '@/components/OffresTarifs'
import EditableText from '@/components/edit-mode/EditableText'


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
            <EditableText id="tarifs.subtitle">Le module 1 est gratuit pour vous deux, jusqu&apos;à la révélation.</EditableText>
          </p>
        </div>

        <div className="mb-12">
          <OffresTarifs onInscription={() => setModal(true)} />
        </div>

        <p className="text-center mt-8" style={{ fontSize: 12, color: 'var(--muted)' }}>
          <EditableText id="tarifs.footer.prefix">Détail des abonnements, résiliation et règles du jeu :</EditableText>{' '}
          <Link href="/mentions-legales" style={{ color: 'var(--brand)' }}><EditableText id="tarifs.footer.link">conditions d&apos;utilisation</EditableText></Link>.
        </p>
      </main>

      {modal && <InscriptionModal onClose={() => setModal(false)} />}
    </div>
  )
}
