import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { marquerIntroVue } from '@/app/actions/profile'
import YesBoxLogo from '@/components/YesBoxLogo'
import { ArrowRight } from 'lucide-react'

export const metadata = { title: 'Bienvenue' }

export default async function BienvenuePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase.from('profiles').select('intro_vue').eq('id', user.id).single()
  if (profile?.intro_vue) redirect('/tableau-de-bord')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #FAF6F0)' }} className="flex items-center justify-center px-4 py-12">
      <div className="card p-8 sm:p-10 fade" style={{ maxWidth: 640 }}>
        <div className="flex justify-center mb-8">
          <YesBoxLogo size="md" />
        </div>

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

        <form action={marquerIntroVue} className="mt-9">
          <button type="submit" className="btn-brand lg w-full flex items-center justify-center gap-2">
            J'ai compris, on commence <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
