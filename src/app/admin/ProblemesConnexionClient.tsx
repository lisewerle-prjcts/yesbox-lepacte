'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { adminRenvoyerConfirmation, adminConfirmerEmail, adminDebloquerConnexion } from '@/app/actions/admin'
import type { Blocage, CompteNonConfirme, EchecEmail } from '@/lib/problemes-connexion'

const dateHeure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
const lien = { color: 'var(--brand)', fontSize: 12, fontWeight: 600 } as const

// Encart « Problèmes de connexion et d'e-mails » de la vue d'ensemble.
export default function ProblemesConnexionClient({ nonConfirmes, bloques, echecs }: { nonConfirmes: CompteNonConfirme[]; bloques: Blocage[]; echecs: EchecEmail[] }) {
  const total = nonConfirmes.length + bloques.length + echecs.length
  return (
    <div className="card p-6 mb-8">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h2 className="font-mono font-bold" style={{ fontSize: 13, letterSpacing: '.1em', color: 'var(--ink)' }}>PROBLÈMES DE CONNEXION ET D’E-MAILS</h2>
        <span className={total ? 'tag-brand' : 'tag-muted'} style={{ fontSize: 11 }}>{total ? `${total} à regarder` : 'Rien à signaler'}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
        Pour les e-mails partis mais jamais arrivés (adresse inexistante, boîte pleine, spam), regarde dans Resend.
      </p>
      <div className="space-y-3">
        <Section titre="Adresses jamais confirmées (inscrites depuis plus de 24 h)" nombre={nonConfirmes.length}>
          {nonConfirmes.map(c => <LigneNonConfirme key={c.id} compte={c} />)}
        </Section>
        <Section titre="Connexions bloquées après trop d’essais (15 minutes)" nombre={bloques.length}>
          {bloques.map(b => <LigneBlocage key={b.cle} blocage={b} />)}
        </Section>
        <Section titre="E-mails qui n’ont pas pu partir (30 derniers jours)" nombre={echecs.length}>
          {echecs.map((e, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              <span className="font-mono" style={{ color: 'var(--muted)', fontSize: 11 }}>{dateHeure(e.date)}</span>{' '}
              <strong>{e.destinataire}</strong> — {e.sujet}
              {e.erreur && <div style={{ fontSize: 11, color: '#dc2626', marginLeft: 12 }}>{e.erreur}</div>}
            </li>
          ))}
        </Section>
      </div>
    </div>
  )
}

function Section({ titre, nombre, children }: { titre: string; nombre: number; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="surface p-3">
      <button type="button" onClick={() => nombre && setOuvert(o => !o)} className="w-full flex items-center justify-between gap-2 text-left" style={{ cursor: nombre ? 'pointer' : 'default' }}>
        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{titre}</span>
        <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: nombre ? '#d97706' : 'var(--sage)' }}>
          {nombre || '✓ aucun'}
          {nombre > 0 && (ouvert ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
        </span>
      </button>
      {ouvert && nombre > 0 && <ul className="mt-3 space-y-2">{children}</ul>}
    </div>
  )
}

function LigneNonConfirme({ compte }: { compte: CompteNonConfirme }) {
  const router = useRouter()
  const [info, setInfo] = useState<{ ok: boolean; texte: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function agir(fn: () => Promise<{ success?: boolean; error?: string }>, ok: string) {
    setBusy(true)
    setInfo(null)
    const res = await fn()
    setBusy(false)
    setInfo(res.error ? { ok: false, texte: res.error } : { ok: true, texte: ok })
    if (!res.error) router.refresh()
  }

  return (
    <li style={{ fontSize: 13, color: 'var(--ink-2)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span><strong>{compte.prenom || '—'}</strong> {compte.email}</span>
        <span className="font-mono" style={{ color: 'var(--muted)', fontSize: 11 }}>inscrit·e le {dateHeure(compte.inscritLe)}</span>
        <button disabled={busy} onClick={() => agir(() => adminRenvoyerConfirmation(compte.id), 'E-mail de confirmation renvoyé.')} style={lien}>Renvoyer l’e-mail</button>
        <button disabled={busy} onClick={() => window.confirm(`Confirmer l’adresse ${compte.email} sans que la personne clique sur le lien ?`) && agir(() => adminConfirmerEmail(compte.id), 'Adresse confirmée.')} style={lien}>Confirmer à la main</button>
      </div>
      {info && <div style={{ fontSize: 11, color: info.ok ? 'var(--sage)' : '#dc2626' }}>{info.texte}</div>}
    </li>
  )
}

function LigneBlocage({ blocage }: { blocage: Blocage }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <li style={{ fontSize: 13, color: 'var(--ink-2)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span>{blocage.libelle}</span>
        <span className="font-mono" style={{ color: 'var(--muted)', fontSize: 11 }}>jusqu’à {dateHeure(blocage.jusqua)}</span>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            const res = await adminDebloquerConnexion(blocage.cle)
            setBusy(false)
            if (res.error) setErreur(res.error)
            else router.refresh()
          }}
          style={lien}
        >
          Débloquer
        </button>
      </div>
      {erreur && <div style={{ fontSize: 11, color: '#dc2626' }}>{erreur}</div>}
    </li>
  )
}
