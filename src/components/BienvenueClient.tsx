'use client'

import { useState, useTransition } from 'react'
import YesBoxLogo from '@/components/YesBoxLogo'
import { marquerIntroVue } from '@/app/actions/profile'
import { ArrowRight, ArrowLeft } from 'lucide-react'

export default function BienvenueClient({ prenomInitial }: { prenomInitial: string | null }) {
  const [step, setStep] = useState<'intro' | 'prenom'>('intro')
  const [prenom, setPrenom] = useState(prenomInitial ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function valider() {
    if (prenom.trim().length < 2) {
      setError('Ton prénom doit contenir au moins 2 caractères.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await marquerIntroVue(prenom)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #FAF6F0)' }} className="flex items-center justify-center px-4 py-12">
      <div className="card p-8 sm:p-10 fade" style={{ maxWidth: 640 }}>
        <div className="flex justify-center mb-8">
          <YesBoxLogo size="md" />
        </div>

        {step === 'intro' ? (
          <>
            <div style={{ fontSize: 14.5, lineHeight: 1.85, color: 'var(--ink-2, #3a352e)' }} className="flex flex-col gap-5">
              <p>
                Vous avez choisi la YES BOX pour vous accompagner dans votre engagement de couple.
              </p>
              <p>
                Que vous soyez ensemble depuis 2 mois ou 20 ans, cette box a pour objectif de vous aider à mieux vous comprendre, et consolider votre engagement.
              </p>
              <p>
                Construire un couple qui tient. Ça s'apprend, ça se choisit, ça se travaille. C'est ce que vous allez découvrir ici, ensemble, à votre rythme. Pas de thérapeute, pas de coach, pas de bonnes réponses : juste vous deux, et la liberté de vous poser les bonnes questions.
              </p>

              <div>
                <p className="font-serif font-bold" style={{ fontSize: 19, color: 'var(--ink)', marginBottom: 10 }}>Comment ça marche ?</p>
                <p>
                  L'accompagnement est composé de différents modules.
                </p>
                <p>
                  À chaque fois, nous vous proposons une série de questions. Répondez de votre côté, dans votre espace. Quand vous aurez tous les deux répondu, vous verrez s'afficher vos réponses et les siennes, côte à côte.
                </p>
              </div>

              <p>
                Jouez le jeu pleinement, en sécurisant suffisamment de temps pour réfléchir, mais aussi honnêtement, pour faire de cet accompagnement un temps fort de l'histoire de votre couple. Il n'y a pas de bonnes réponses, seulement vos réponses.
              </p>
              <p>
                Vous avez aussi à votre disposition un bloc-note, personnel. Écrivez ce qui vous tient à cœur, vos ressentis, vos impressions.
              </p>
              <p>
                Notre conseil : planifiez vos soirées YES BOX pour apprécier au maximum ses bienfaits.
              </p>
              <p style={{ fontStyle: 'italic' }}>
                Et rappelez-vous : le couple qui tient n'est pas le couple parfait. C'est celui qui sait revenir. Qui sait se choisir, encore et encore.
              </p>
            </div>

            <button type="button" onClick={() => setStep('prenom')} className="btn-brand lg w-full flex items-center justify-center gap-2 mt-9">
              J'ai compris, on commence <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-2">
              <p className="eyebrow justify-center mb-3">Avant de commencer</p>
              <h1 className="font-serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                Quel est ton prénom ?
              </h1>
              <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>
                Il servira à nommer le module qui te sera consacré, et à te présenter à ton/ta partenaire.
              </p>
            </div>

            <input
              type="text"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              placeholder="Ton prénom"
              className="field"
              style={{ fontSize: 16, textAlign: 'center', marginBottom: 8 }}
              autoFocus
            />
            {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</p>}

            <button type="button" onClick={valider} disabled={isPending}
              className="btn-brand lg w-full flex items-center justify-center gap-2 mt-6">
              {isPending ? 'Enregistrement…' : "C'est parti"} <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setStep('intro')}
              className="flex items-center justify-center gap-1.5 text-sm font-medium mx-auto mt-4"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
              <ArrowLeft className="w-3.5 h-3.5" />Revoir l'introduction
            </button>
          </>
        )}
      </div>
    </div>
  )
}
