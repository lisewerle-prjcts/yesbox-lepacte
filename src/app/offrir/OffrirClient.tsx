'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Gift, Mail, Printer, Ticket } from 'lucide-react'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import { acheterCarteCadeau } from '@/app/actions/cadeau'
import type { PrixCarteCadeau } from '@/lib/cartes-cadeaux'

export default function OffrirClient({ prix, connecte, paiementAnnule }: { prix: PrixCarteCadeau[]; connecte: boolean; paiementAnnule: boolean }) {
  const t = useT()
  const { locale } = useLocale()
  // Une seule carte aujourd'hui : la YES BOX (58 €).
  const [duree, setDuree] = useState<number>(prix.find(p => p.configure)?.duree ?? prix[0]?.duree ?? 12)
  const [pourSoi, setPourSoi] = useState<boolean | null>(null)
  const [prenom1, setPrenom1] = useState('')
  const [prenom2, setPrenom2] = useState('')
  const [deLaPartDe, setDeLaPartDe] = useState('')
  const [cgv, setCgv] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState(paiementAnnule ? t('Paiement annulé : aucun montant n’a été prélevé.', 'Payment canceled: you have not been charged.') : '')

  const formater = (p: PrixCarteCadeau) => p.montant === null
    ? null
    : new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', { style: 'currency', currency: p.devise.toUpperCase(), maximumFractionDigits: p.montant % 100 ? 2 : 0 }).format(p.montant / 100)
  const choisi = prix.find(p => p.duree === duree)
  const prixChoisi = choisi ? formater(choisi) : null

  async function payer() {
    if (pourSoi === null) { setErreur(t('Dis-nous d’abord à qui est destinée la carte.', 'First tell us who the card is for.')); return }
    setErreur('')
    setChargement(true)
    const res = await acheterCarteCadeau({ dureeMois: duree, pourSoi, deLaPartDe, prenom1, prenom2, cgvAcceptees: cgv })
    if ('error' in res) { setErreur(res.error); setChargement(false); return }
    window.location.href = res.url
  }

  const choixPourQui = [
    { valeur: false, titre: t('C’est un cadeau pour un couple', 'It’s a gift for a couple'), desc: t('Vous recevez un code et une carte à imprimer à lui offrir.', 'You get a code and a printable card to give them.') },
    { valeur: true, titre: t('Je fais partie du couple', 'I’m part of the couple'), desc: t('Vous l’offrez à vous deux : le code s’active dans Mon compte.', 'You’re treating the two of you: activate the code in My Account.') },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          {connecte
            ? <Link href="/tableau-de-bord" className="btn-ghost text-sm py-2 px-4 whitespace-nowrap">{t('Mon espace', 'My space')}</Link>
            : <Link href="/connexion" className="btn-ghost text-sm py-2 px-4 whitespace-nowrap">{t('Se connecter', 'Log in')}</Link>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <div className="eyebrow justify-center mb-3"><EditableText id="offrir.eyebrow">Carte cadeau</EditableText></div>
          <h1 className="font-serif font-bold mb-3" style={{ fontSize: 'clamp(28px, 5vw, 44px)', color: 'var(--ink)' }}>
            <EditableText id="offrir.titre">Offrez YES BOX à un couple</EditableText>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            <EditableText id="offrir.sousTitre.v2" multiline>Des soirées à deux pour mieux se connaître, mieux se parler et choisir de s’engager. Offrez la YES BOX : tous les modules jusqu’au pacte, pendant 1 an, avec une jolie carte à imprimer.</EditableText>
          </p>
        </div>

        <div className="card p-6 sm:p-8 space-y-8">
          {/* 1. Durée */}
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 18, color: 'var(--ink)' }}>1. {t('Votre cadeau', 'Your gift')}</h2>
            <div className="grid gap-3">
              {prix.map(p => {
                const actif = duree === p.duree
                const montant = formater(p)
                return (
                  <button key={p.duree} type="button" disabled={!p.configure} onClick={() => setDuree(p.duree)}
                    className="rounded-xl p-4 text-left transition-all"
                    style={{ border: `2px solid ${actif ? 'var(--brand)' : 'var(--line)'}`, background: actif ? 'var(--brand-tint)' : 'white', opacity: p.configure ? 1 : 0.5 }}>
                    <div className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--ink)' }}>{t('Le pack initial', 'The starter pack')}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 2 }}>
                      {t('Les 8 modules et le module Pacte de couple, un an pour le réaliser · ensuite 19 €/an si le couple souhaite continuer', 'The 8 modules and the Couple’s Pact module, one year to complete it · then €19/year if the couple wants to continue')}
                    </div>
                    <div style={{ fontSize: 14, color: actif ? 'var(--brand)' : 'var(--muted)', fontWeight: 600 }}>
                      {p.configure ? (montant ?? '—') : t('Bientôt disponible', 'Coming soon')}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 2. Pour qui */}
          <section>
            <h2 className="font-serif font-bold mb-3" style={{ fontSize: 18, color: 'var(--ink)' }}>2. {t('À qui est destinée la carte ?', 'Who is the card for?')}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {choixPourQui.map(c => {
                const actif = pourSoi === c.valeur
                return (
                  <button key={String(c.valeur)} type="button" onClick={() => setPourSoi(c.valeur)}
                    className="rounded-xl p-4 text-left transition-all flex gap-3 items-start"
                    style={{ border: `2px solid ${actif ? 'var(--brand)' : 'var(--line)'}`, background: actif ? 'var(--brand-tint)' : 'white' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ border: `2px solid ${actif ? 'var(--brand)' : 'var(--line-2)'}`, background: actif ? 'var(--brand)' : 'white' }}>
                      {actif && <Check className="w-3 h-3" style={{ color: 'white' }} />}
                    </span>
                    <span>
                      <span className="block font-semibold" style={{ fontSize: 14.5, color: 'var(--ink)' }}>{c.titre}</span>
                      <span className="block" style={{ fontSize: 13, color: 'var(--muted)' }}>{c.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 3. Personnalisation de la carte */}
          {pourSoi !== null && (
            <section>
              <h2 className="font-serif font-bold mb-1" style={{ fontSize: 18, color: 'var(--ink)' }}>3. {t('Personnaliser la carte', 'Personalize the card')}</h2>
              <p className="mb-3" style={{ fontSize: 13, color: 'var(--muted)' }}>
                {t('Facultatif : ces prénoms sont imprimés sur la carte. Laissez vide pour les écrire à la main.', 'Optional: these first names are printed on the card. Leave blank to write them by hand.')}
              </p>
              <label className="label">{t('Pour vous deux', 'For the two of you')}</label>
              <div className="flex items-center gap-2 mb-4">
                <input type="text" className="input-field" maxLength={40} placeholder={t('Prénom', 'First name')} value={prenom1} onChange={e => setPrenom1(e.target.value)} />
                <span className="font-serif" style={{ fontSize: 20, color: 'var(--ink)' }}>&amp;</span>
                <input type="text" className="input-field" maxLength={40} placeholder={t('Prénom', 'First name')} value={prenom2} onChange={e => setPrenom2(e.target.value)} />
              </div>
              {!pourSoi && (
                <>
                  <label className="label">{t('De la part de', 'From')}</label>
                  <input type="text" className="input-field" maxLength={60} placeholder={t('Votre prénom, ou « Toute la famille »', 'Your first name, or "The whole family"')} value={deLaPartDe} onChange={e => setDeLaPartDe(e.target.value)} />
                </>
              )}
            </section>
          )}

          {/* Paiement */}
          <section style={{ borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <label className="flex gap-2 items-start cursor-pointer mb-4" style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              <input type="checkbox" checked={cgv} onChange={e => setCgv(e.target.checked)} className="mt-0.5 shrink-0" />
              <span>
                {t('J’ai lu et j’accepte les', 'I have read and accept the')}{' '}
                <Link href="/cgv#cartes-cadeaux" target="_blank" style={{ textDecoration: 'underline' }}>{t('CGV', 'terms of sale')}</Link>
                {t(' (carte cadeau valable 1 an, remboursable sous 14 jours tant que le code n’a pas été utilisé)', ' (gift card valid for 1 year, refundable within 14 days as long as the code has not been used)')}
              </span>
            </label>
            {erreur && <p className="text-sm text-red-600 mb-3">{erreur}</p>}
            <button onClick={payer} disabled={chargement || !cgv || pourSoi === null || !choisi?.configure} className="btn-brand lg w-full justify-center">
              <Gift className="w-4 h-4" />
              {chargement
                ? t('Redirection vers le paiement…', 'Redirecting to payment…')
                : prixChoisi ? t(`Offrir le pack initial · ${prixChoisi}`, `Give the starter pack · ${prixChoisi}`) : t('Offrir le pack initial', 'Give the starter pack')}
              {!chargement && <ArrowRight className="w-4 h-4" />}
            </button>
            <p className="text-center mt-3" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {t('Paiement sécurisé par Stripe · TVA non applicable, art. 293 B du CGI', 'Secure payment via Stripe · VAT not applicable, art. 293 B of the French tax code')}
            </p>
          </section>
        </div>

        {/* Comment ça marche */}
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {[
            { icone: <Mail className="w-5 h-5" />, titre: t('Un code par e-mail', 'A code by email'), desc: t('Dès le paiement, vous recevez un code de la forme YES-XXXX-XXXX.', 'Right after payment, you receive a code like YES-XXXX-XXXX.') },
            { icone: <Printer className="w-5 h-5" />, titre: t('Une carte à imprimer', 'A printable card'), desc: t('Téléchargez la carte cadeau et glissez-la dans une enveloppe.', 'Download the gift card and slip it into an envelope.') },
            { icone: <Ticket className="w-5 h-5" />, titre: t('Activation en un clic', 'One-click activation'), desc: t('Le couple saisit le code à l’inscription ou dans Mon compte. Valable 1 an.', 'The couple enters the code when signing up or in My Account. Valid for 1 year.') },
          ].map(e => (
            <div key={e.titre} className="text-center px-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{e.icone}</div>
              <div className="font-semibold" style={{ fontSize: 14.5, color: 'var(--ink)' }}>{e.titre}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{e.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
