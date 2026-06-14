'use client'

import { useState } from 'react'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import PrecommandeModal from '@/components/PrecommandeModal'
import { MODULES } from '@/lib/modules-data'
import { ArrowRight, Check, Menu, X } from 'lucide-react'

const TEMOIGNAGES = [
  { citation: "On a parlé d'argent pour la première fois en 4 ans. Et c'était simple.", nom: 'Julie & Romain', meta: 'Mariés en 2026 · Toulouse', initiale: 'J', av: 'av-c' },
  { citation: "L'idée du CDD m'a fait sourire. Aujourd'hui c'est notre rituel préféré.", nom: 'Thomas & Inès', meta: 'Pacte signé en 2024 · Bordeaux', initiale: 'T', av: 'av-a' },
  { citation: "Le meilleur cadeau qu'on se soit fait avant le mariage.", nom: 'Margaux & Pierre', meta: 'Mariés en 2025 · Paris', initiale: 'M', av: 'av-c' },
]

const POUR_QUI = [
  { titre: 'Vous préparez votre mariage', desc: "Et vous voulez que la préparation porte sur vous deux — pas seulement sur le plan de table." },
  { titre: "Vous vous engagez bientôt", desc: "Emménagement, achat commun, premier enfant : un nouveau cap, qui mérite qu'on s'y prépare." },
  { titre: "Vous voulez éviter les non-dits", desc: "Vous sentez qu'il y a des sujets qu'on évite, des conversations qu'on remet à plus tard." },
  { titre: "Vous aimez les choses faites bien", desc: "Pas de thérapie en urgence : une démarche posée, intentionnelle, à votre rythme." },
  { titre: "Vous voulez écrire vos vœux", desc: "Et vous ne savez pas par où commencer. Le programme se termine par cet exercice, accompagné." },
  { titre: "Vous croyez à l'engagement long", desc: "Et vous voulez vous donner les outils pour le faire durer — pas le subir." },
]

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: 'var(--font-geist), sans-serif', background: 'var(--cream)', minHeight: '100vh' }}>
      {/* ─── NAV ─── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(246,241,234,.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <YesBoxLogo size="sm" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {[['#forwhom', 'Pour qui'], ['#modules', 'Les modules'], ['#tarifs', 'Tarifs']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium transition-colors" style={{ color: 'var(--muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/connexion" className="btn-ghost text-sm py-2 px-4">Se connecter</Link>
            <button onClick={() => setModalOpen(true)} className="btn-brand text-sm py-2 px-4">
              Pré-commander
            </button>
          </div>

          {/* Mobile */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '16px 24px' }} className="md:hidden space-y-3">
            {[['#forwhom', 'Pour qui'], ['#modules', 'Les modules'], ['#tarifs', 'Tarifs']].map(([href, label]) => (
              <a key={href} href={href} className="block text-sm font-medium py-1" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/connexion" className="btn-ghost text-sm py-2 px-4 flex-1 justify-center">Connexion</Link>
              <button onClick={() => { setModalOpen(true); setMenuOpen(false) }} className="btn-brand text-sm py-2 px-4 flex-1 justify-center">Pré-commander</button>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 72px', textAlign: 'center' }}>
        <div className="eyebrow justify-center mb-6">Programme en 7 modules · à faire à deux</div>

        <h1 className="font-serif" style={{ fontSize: 'clamp(40px, 7vw, 72px)', lineHeight: 1.05, fontWeight: 700, color: 'var(--ink)', marginBottom: 24, letterSpacing: '-0.02em' }}>
          Le pacte des couples<br /><em style={{ color: 'var(--brand)' }}>qui tiennent.</em>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 36px' }}>
          YES BOX, c'est un programme pour se (re)dire OUI pour la vie. Mieux vous connaître, mieux communiquer, et signer votre propre <strong style={{ color: 'var(--ink)' }}>CDD de couple</strong> — avec un rendez-vous annuel pour le faire durer.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button onClick={() => setModalOpen(true)} className="btn-brand lg">
            Pré-commander — 89 € <ArrowRight className="w-4 h-4" />
          </button>
          <a href="#modules" className="btn-ghost lg">Voir le programme</a>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2" style={{ color: 'var(--muted)', fontSize: 13 }}>
          <span>✦ Module 1 gratuit</span>
          <span>✦ À votre rythme</span>
          <span>✦ Lancement 1er sept. 2026</span>
          <span>✦ Accès à vie</span>
        </div>
      </section>

      {/* ─── POUR QUI ─── */}
      <section id="forwhom" style={{ background: 'var(--paper)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3">Pour qui</div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: 'var(--ink)' }}>
              Ce programme est fait pour <em style={{ color: 'var(--brand)' }}>vous deux</em>, si…
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POUR_QUI.map(item => (
              <div key={item.titre} className="card p-6">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--sage-soft)' }}>
                    <Check className="w-3.5 h-3.5" style={{ color: 'var(--sage)' }} />
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1.5" style={{ fontSize: 15 }}>{item.titre}</h4>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LE CONSTAT ─── */}
      <section style={{ padding: '80px 24px', maxWidth: 1080, margin: '0 auto' }}>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="eyebrow mb-4">Le constat</div>
            <blockquote className="font-serif" style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.35, color: 'var(--ink)', marginBottom: 20, fontStyle: 'italic' }}>
              "On organise un mariage pendant 18 mois. On prépare le couple pendant… combien ?"
            </blockquote>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--muted)' }}>
              La plupart des couples s'engagent <em>sans avoir pris le temps de poser les bases</em>. On parle de robe, de salle, de menu, de musique. Mais rarement de finances, de désir d'enfants, de famille, de rythme, de silences.
            </p>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--muted)', marginTop: 12 }}>
              Résultat : on découvre l'autre <em>après</em> le oui. Ce qui aurait pu se dire calmement à deux finit chez un thérapeute à trois. Ce n'est pas qu'on s'aime mal. C'est qu'on n'a pas appris à <em>se choisir</em>, en conscience, sur la durée.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[['45 %', 'des mariages se terminent par un divorce en France'], ['68 %', 'des disputes portent sur des sujets jamais abordés avant l\'engagement'], ['0 h', 'de préparation conjugale en moyenne, hors mariage religieux']].map(([n, l]) => (
              <div key={n} className="card p-6 flex gap-5 items-center">
                <div className="font-serif font-bold flex-shrink-0" style={{ fontSize: 36, color: 'var(--brand)', lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LES 7 MODULES ─── */}
      <section id="modules" style={{ background: 'var(--cream-2)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3">Le programme</div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: 'var(--ink)' }}>
              Six modules pour poser les bases.<br />Un septième pour les faire durer.
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {MODULES.map(m => (
              <div key={m.slug} className="card flex items-center gap-5 p-5">
                <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: 'var(--muted)', width: 28 }}>0{m.n}</span>
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}>{m.titre}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{m.sousTitre}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>{m.description}</p>
                </div>
                {m.free && <span className="tag-sage flex-shrink-0">Gratuit</span>}
                {m.n === 7 && <span className="tag-muted flex-shrink-0">Annuel</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CDD DE COUPLE ─── */}
      <section style={{ background: 'var(--dark)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="eyebrow mb-4" style={{ color: 'var(--dark-muted)' }}>L'idée signature</div>
              <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: 'var(--dark-paper)', lineHeight: 1.15 }}>
                Un <em style={{ color: '#f7d9e6' }}>CDD de couple</em>,<br />à re-signer chaque année.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--dark-muted)', marginTop: 16 }}>
                Comme en entreprise — la clarté des engagements, le bilan régulier, la révision des projets — mais avec amour. À la fin du programme, vous rédigez votre Contrat à Durée Déterminée de couple : vos articles, vos valeurs, vos projets. Avec un rendez-vous annuel inscrit dedans.
              </p>
              <ul className="mt-6 space-y-3">
                {['Vos engagements, écrits noir sur blanc', 'Un bilan à votre date anniversaire, chaque année', 'Un avenant pour évoluer ensemble, et re-signer « nous »'].map(item => (
                  <li key={item} className="flex gap-3 items-start">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                    <span style={{ fontSize: 14, color: 'var(--dark-muted)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* CDD document */}
            <div style={{ background: 'var(--dark-paper)', borderRadius: 'var(--r-lg)', padding: '28px', position: 'relative', border: '1px solid rgba(255,255,255,.08)' }}>
              <p className="font-mono text-center mb-1" style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Contrat à durée déterminée</p>
              <h3 className="font-serif text-center mb-5" style={{ fontSize: 22, color: 'var(--ink)' }}>Le CDD de couple</h3>
              {[['Article 1', 'Engagement mutuel'], ['Article 2', 'Valeurs partagées'], ['Article 3', 'Projets communs'], ['Avenant', 'Bilan annuel'], ['Renouvellement', 'Annuel']].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3" style={{ borderBottom: '1px solid var(--line)', fontSize: 13.5 }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ position: 'absolute', top: 16, right: 16, width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--brand)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)' }}>
                <span className="font-mono" style={{ fontSize: 7, color: 'var(--brand)', textAlign: 'center', lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: '.05em' }}>À re-signer<br />chaque<br />année</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TÉMOIGNAGES ─── */}
      <section style={{ background: 'var(--cream-2)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3">Ils ont signé leur pacte</div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 700, color: 'var(--ink)' }}>Ce qu'ils ont vraiment changé.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TEMOIGNAGES.map(t => (
              <div key={t.nom} className="card p-6 flex flex-col gap-4">
                <div style={{ color: 'var(--brand)', letterSpacing: 2, fontSize: 14 }}>★★★★★</div>
                <blockquote className="font-serif" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1.45, color: 'var(--ink)', flex: 1 }}>
                  « {t.citation} »
                </blockquote>
                <div className="flex items-center gap-3">
                  <span className={`av ${t.av}`}>{t.initiale}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.nom}</div>
                    <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{t.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TARIFS ─── */}
      <section id="tarifs" style={{ background: 'var(--paper)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3">Tarifs</div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 700, color: 'var(--ink)' }}>
              Un seul achat. Une vie de rendez-vous.
            </h2>
            <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14 }}>Le module 1 est gratuit. Lancement le <strong style={{ color: 'var(--ink)' }}>1er septembre 2026</strong>.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Gratuit */}
            <div className="card p-6 flex flex-col gap-4">
              <div className="tag-muted self-start">Découverte</div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'var(--ink)' }}>0 <small style={{ fontSize: 18 }}>€</small></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Module 1 gratuit · toujours</div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
              {['Module "Moi et toi"', 'Questions personnelles', "Espace couple privé"].map(f => (
                <div key={f} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{f}</span>
                </div>
              ))}
              <Link href="/inscription" className="btn-ghost text-center justify-center mt-auto">Commencer gratuitement</Link>
            </div>

            {/* Complet — featured */}
            <div className="card p-6 flex flex-col gap-4" style={{ background: 'var(--brand)', border: 'none' }}>
              <div className="self-start px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>Accès complet</div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'white' }}>89 <small style={{ fontSize: 18 }}>€</small></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>paiement unique · accès à vie</div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)' }} />
              {['Les 7 modules complets', 'Sessions de révélation à deux', 'Score de connivence & journal', 'Votre CDD de couple', 'Garantie 30 jours'].map(f => (
                <div key={f} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.8)' }} />
                  <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.9)' }}>{f}</span>
                </div>
              ))}
              <button onClick={() => setModalOpen(true)} className="mt-auto flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg transition-all" style={{ background: 'white', color: 'var(--brand)', fontSize: 14 }}>
                Pré-commander <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Renouvellement */}
            <div className="card p-6 flex flex-col gap-4">
              <div className="tag-brand self-start">Renouvellement</div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'var(--ink)' }}>19 <small style={{ fontSize: 18 }}>€ / an</small></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>module 7 · à activer plus tard</div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
              {['Rappel annuel à votre anniversaire', 'Fiche avenant générée', 'Nouvelles questions chaque année', 'Annulable à tout moment'].map(f => (
                <div key={f} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{f}</span>
                </div>
              ))}
              <Link href="/inscription" className="btn-ghost text-center justify-center mt-auto">Plus tard, dans l'app</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
        <div className="eyebrow justify-center mb-4">Dernière étape</div>
        <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
          Posez les bases. Maintenant.
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 15 }}>
          Le module 1 est gratuit. Commencez à deux, ce soir.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => setModalOpen(true)} className="btn-brand lg">
            Pré-commander — 89 € <ArrowRight className="w-4 h-4" />
          </button>
          <Link href="/inscription" className="btn-ghost lg">Essayer gratuitement</Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: 'var(--ink)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div className="font-serif font-bold" style={{ color: 'var(--dark-paper)', fontSize: 20 }}>YES BOX</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>Le pacte des couples qui tiennent</div>
          </div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>
            © 2026 YES BOX · yesbox-lepacte.fr · hello@yesbox-lepacte.fr
          </div>
          <div className="flex gap-4">
            <Link href="/connexion" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Connexion</Link>
            <Link href="/inscription" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Inscription</Link>
          </div>
        </div>
      </footer>

      {modalOpen && <PrecommandeModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
