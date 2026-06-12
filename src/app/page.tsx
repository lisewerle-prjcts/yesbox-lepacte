import Link from 'next/link'
import Logo from '@/components/Logo'
import { Heart, Lock, Sparkles, ChevronRight } from 'lucide-react'

export default function LandingPage() {
  const modules = [
    { emoji: '💎', titre: 'Nos Valeurs', desc: 'Ce qui vous unit profondément' },
    { emoji: '💬', titre: 'Notre Communication', desc: 'Un langage commun et bienveillant' },
    { emoji: '❤️', titre: 'Notre Intimité', desc: 'Vos besoins affectifs explorés' },
    { emoji: '💰', titre: 'Nos Finances', desc: 'Alignés pour avancer ensemble' },
    { emoji: '🚀', titre: 'Nos Projets', desc: "L'avenir que vous dessinez" },
    { emoji: '🏡', titre: 'Notre Famille', desc: 'Vos visions sur demain' },
    { emoji: '🌱', titre: 'Notre Croissance', desc: 'Grandir ensemble, chaque jour' },
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-cream-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/connexion" className="btn-ghost text-sm">
              Se connecter
            </Link>
            <Link href="/inscription" className="btn-primary text-sm py-2">
              Commencer
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-magenta-50 text-magenta px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span>Le premier pacte de couple guidé</span>
        </div>

        <h1 className="font-fraunces text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight animate-slide-up">
          Construis les{' '}
          <span className="gradient-text">fondations</span>
          <br />
          de votre amour
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          YES BOX — Le Pacte est un parcours en 7 modules pour explorer, aligner et célébrer
          ce que vous voulez construire ensemble.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/inscription" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
            Créer votre pacte
            <ChevronRight className="w-5 h-5" />
          </Link>
          <Link href="/connexion" className="btn-secondary text-lg px-8 py-4">
            Se connecter
          </Link>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-12 mt-16 pt-8 border-t border-cream-300">
          {[
            { value: '7', label: 'Modules profonds' },
            { value: '28', label: 'Questions clés' },
            { value: '1', label: 'Pacte commun' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-fraunces text-3xl font-bold text-magenta">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="section-title text-center mb-4">Comment ça marche ?</h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            Un parcours simple en trois étapes pour créer votre pacte de couple.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: <Heart className="w-8 h-8 text-magenta" />,
                titre: 'Créez votre espace',
                desc: "Inscris-toi, invite ton/ta partenaire via un lien magique, et votre espace commun s'ouvre.",
              },
              {
                step: '02',
                icon: <Sparkles className="w-8 h-8 text-magenta" />,
                titre: 'Explorez à votre rythme',
                desc: 'Répondez chacun aux questions des 7 modules, en toute indépendance et bienveillance.',
              },
              {
                step: '03',
                icon: <Lock className="w-8 h-8 text-magenta" />,
                titre: 'Signez votre Pacte',
                desc: 'Découvrez vos alignements, discutez vos différences, et signez votre pacte ensemble.',
              },
            ].map((item) => (
              <div key={item.step} className="card relative">
                <div className="absolute -top-4 left-6 bg-magenta text-white font-fraunces font-bold text-sm px-3 py-1 rounded-full">
                  {item.step}
                </div>
                <div className="mt-4 mb-4">{item.icon}</div>
                <h3 className="font-fraunces text-xl font-bold mb-3">{item.titre}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Les 7 modules */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="section-title text-center mb-4">Les 7 piliers de votre Pacte</h2>
        <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
          Chaque module aborde un aspect fondamental de votre vie à deux.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((m, i) => (
            <div
              key={m.titre}
              className="card hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-default"
            >
              <div className="text-3xl mb-3">{m.emoji}</div>
              <h3 className="font-fraunces font-bold text-lg mb-1">{m.titre}</h3>
              <p className="text-sm text-gray-500">{m.desc}</p>
              {i === 6 && (
                <div className="mt-3 text-xs text-magenta font-semibold bg-magenta-50 px-2 py-1 rounded-lg inline-block">
                  Module final
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-magenta to-magenta-600 py-20 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-fraunces text-4xl font-bold mb-4">
            Prêt·e à construire votre pacte ?
          </h2>
          <p className="text-magenta-100 text-lg mb-8">
            Rejoins des milliers de couples qui construisent leur relation avec intention.
          </p>
          <Link
            href="/inscription"
            className="inline-flex items-center gap-2 bg-white text-magenta font-bold px-8 py-4 rounded-2xl hover:bg-cream transition-all duration-200"
          >
            Commencer maintenant
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-cream-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <Logo size="sm" />
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} YES BOX — Le Pacte. Fait avec ❤️
          </p>
        </div>
      </footer>
    </div>
  )
}
