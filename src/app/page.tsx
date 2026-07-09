'use client'

import { useState } from 'react'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit/EditableText'
import { MODULES } from '@/lib/modules-data'
import { ArrowRight, Check, Menu, X, User, Users, Heart, MessageCircle, Zap, FileText, Home, Rocket, GraduationCap } from 'lucide-react'

const MODULE_ICONS = [User, User, Heart, Home, Rocket, Users, MessageCircle, Zap, FileText, GraduationCap]

const TEMOIGNAGES = [
  { texte: "On a découvert des choses qu'on n'avait jamais osé dire après 4 ans ensemble. Le module sur les conflits nous a sauvés.", prenom: 'Marie & Tom', lieu: 'Paris' },
  { texte: "Notre CDD de couple est encadré dans notre salon. On le relit chaque anniversaire. C'est notre plus belle décision.", prenom: 'Inès & Rémi', lieu: 'Lyon' },
  { texte: "Je recommande à tous les couples qui veulent aller plus loin que le PACS. Une vraie préparation émotionnelle.", prenom: 'Sophie & Lucas', lieu: 'Bordeaux' },
]

const POUR_QUI = [
  { titre: 'Vous préparez votre mariage', desc: "Et vous voulez que la préparation porte sur vous deux — pas seulement sur le plan de table." },
  { titre: "Vous vous engagez bientôt", desc: "Emménagement, achat commun, premier enfant : un nouveau cap, qui mérite qu'on s'y prépare." },
  { titre: "Vous voulez éviter les non-dits", desc: "Vous sentez qu'il y a des sujets qu'on évite, des conversations qu'on remet à plus tard." },
  { titre: "Vous aimez les choses faites bien", desc: "Pas de thérapie en urgence : une démarche posée, intentionnelle, à votre rythme." },
  { titre: "Vous voulez écrire vos vœux", desc: "Et vous ne savez pas par où commencer. Le programme se termine par cet exercice, accompagné." },
  { titre: "Vous croyez à l'engagement long", desc: "Et vous voulez vous donner les outils pour le faire durer — pas le subir." },
]

const CONSTAT_STATS = [
  ['45 %', 'des mariages se terminent par un divorce en France'],
  ['68 %', "des disputes portent sur des sujets jamais abordés avant l'engagement"],
  ['0 h', 'de préparation conjugale en moyenne, hors mariage religieux'],
]

const CDD_POINTS = [
  'Vos engagements, écrits noir sur blanc',
  'Un bilan à votre date anniversaire, chaque année',
  'Un avenant pour évoluer ensemble, et re-signer « nous »',
]

const OFFRE_GRATUITE = ['Le module 1, à vos deux prénoms', 'Questions personnelles', 'Espace couple privé']
const OFFRE_COMPLETE = ['Les 10 modules complets', 'Sessions de révélation à deux', 'Score de connivence & journal', 'Votre CDD de couple', 'Garantie 30 jours']
const OFFRE_RENOUVELLEMENT = ['Rappel annuel à votre anniversaire', 'Fiche avenant générée', 'Nouvelles questions chaque année', 'Annulable à tout moment']

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <nav className="hidden md:flex items-center gap-6">
            {[['#forwhom', 'Pour qui'], ['#modules', 'Les modules'], ['#tarifs', 'Tarifs']].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium transition-colors" style={{ color: 'var(--muted)' }}>
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/connexion" className="btn-ghost text-sm py-2 px-4">Se connecter</Link>
            <Link href="/inscription" className="btn-brand text-sm py-2 px-4">
              <EditableText k="landing.nav.cta" as="span">Pré-inscription</EditableText>
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden space-y-3" style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '16px 24px' }}>
            {[['#forwhom', 'Pour qui'], ['#modules', 'Les modules'], ['#tarifs', 'Tarifs']].map(([href, label]) => (
              <a key={href} href={href} className="block text-sm font-medium py-1" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/connexion" className="btn-ghost text-sm py-2 px-4 flex-1 justify-center">Connexion</Link>
              <Link href="/inscription" onClick={() => setMenuOpen(false)} className="btn-brand text-sm py-2 px-4 flex-1 justify-center">Pré-inscription</Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="tag-brand mb-6 mx-auto w-fit">
          <EditableText k="landing.hero.eyebrow" as="span">✦ Lancement le 1er septembre 2026</EditableText>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          <EditableText k="landing.hero.titre1" as="span">Le pacte des couples</EditableText><br />
          <em style={{ color: 'var(--brand)' }}><EditableText k="landing.hero.titre2" as="span">qui tiennent.</EditableText></em>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--muted)' }}>
          <EditableText k="landing.hero.soustitre" as="span" multiline>Un programme en 10 modules pour se choisir en conscience, signer votre CDD de couple, et vous retrouver chaque année.</EditableText>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <Link href="/inscription" className="btn-brand lg">
            <EditableText k="landing.hero.cta_principal" as="span">Pré-inscription — gratuite</EditableText> <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#modules" className="btn-ghost lg"><EditableText k="landing.hero.cta_secondaire" as="span">Voir le programme</EditableText></a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          <span>✦ <EditableText k="landing.hero.badge1" as="span">Module 1 gratuit</EditableText></span>
          <span>✦ <EditableText k="landing.hero.badge2" as="span">À votre rythme</EditableText></span>
          <span>✦ <EditableText k="landing.hero.badge3" as="span">Lancement 1er sept. 2026</EditableText></span>
          <span>✦ <EditableText k="landing.hero.badge4" as="span">Accès à vie</EditableText></span>
        </div>
      </section>

      {/* POUR QUI */}
      <section id="forwhom" className="py-20" style={{ background: 'var(--paper)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText k="landing.pourqui.eyebrow" as="span">Pour qui</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText k="landing.pourqui.titre1" as="span">Ce programme est fait pour </EditableText>
              <em style={{ color: 'var(--brand)' }}><EditableText k="landing.pourqui.titre2" as="span">vous deux</EditableText></em>
              <EditableText k="landing.pourqui.titre3" as="span">, si…</EditableText>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POUR_QUI.map((item, i) => (
              <div key={item.titre} className="card p-6 flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--sage-soft)' }}>
                  <Check className="w-3.5 h-3.5" style={{ color: 'var(--sage)' }} />
                </span>
                <div>
                  <h4 className="font-semibold mb-1.5" style={{ fontSize: 15 }}>
                    <EditableText k={`landing.pourqui.${i}.titre`} as="span">{item.titre}</EditableText>
                  </h4>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                    <EditableText k={`landing.pourqui.${i}.desc`} as="span" multiline>{item.desc}</EditableText>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LE CONSTAT */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="eyebrow mb-4"><EditableText k="landing.constat.eyebrow" as="span">Le constat</EditableText></div>
            <blockquote className="font-serif" style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.35, color: 'var(--ink)', marginBottom: 20, fontStyle: 'italic' }}>
              &ldquo;<EditableText k="landing.constat.citation" as="span" multiline>On organise un mariage pendant 18 mois. On prépare le couple pendant… combien ?</EditableText>&rdquo;
            </blockquote>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--muted)' }}>
              <EditableText k="landing.constat.paragraphe" as="span" multiline>La plupart des couples s'engagent sans avoir pris le temps de poser les bases. On parle de robe, de salle, de menu, de musique. Mais rarement de finances, de désir d'enfants, de famille, de rythme, de silences.</EditableText>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {CONSTAT_STATS.map(([n, l], i) => (
              <div key={n} className="card p-6 flex gap-5 items-center">
                <div className="font-serif font-bold flex-shrink-0" style={{ fontSize: 36, color: 'var(--brand)', lineHeight: 1 }}>
                  <EditableText k={`landing.constat.stat${i}.chiffre`} as="span">{n}</EditableText>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  <EditableText k={`landing.constat.stat${i}.label`} as="span" multiline>{l}</EditableText>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LES MODULES */}
      <section id="modules" className="py-20" style={{ background: 'var(--cream-2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText k="landing.modules.eyebrow" as="span">Le programme</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText k="landing.modules.titre1" as="span">Neuf modules pour poser les bases.</EditableText><br />
              <EditableText k="landing.modules.titre2" as="span">Un dixième pour les faire durer, chaque année.</EditableText>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {MODULES.map((m, i) => {
              const Icon = MODULE_ICONS[i] || User
              return (
              <div key={m.slug} className="card flex items-center gap-5 p-5">
                <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: 'var(--brand)', width: 28 }}>0{m.n}</span>
                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 38, height: 38, background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--line)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}>{m.titre}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{m.sousTitre}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>{m.description}</p>
                </div>
                {m.free && <span className="tag-sage flex-shrink-0">Gratuit</span>}
                {m.annuel && <span className="tag-muted flex-shrink-0">Annuel</span>}
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* CDD DE COUPLE */}
      <section className="py-20" style={{ background: '#16120e' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="eyebrow mb-4" style={{ color: 'rgba(255,255,255,.35)', fontFamily: 'var(--font-geist-mono)' }}>
                — <EditableText k="landing.cdd.eyebrow" as="span">L'idée signature</EditableText>
              </div>
              <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: 'rgba(255,255,255,.92)', lineHeight: 1.15 }}>
                Un <em style={{ color: 'var(--brand)', fontStyle: 'italic' }}>CDD de couple</em>,<br />
                <EditableText k="landing.cdd.titre" as="span">à re-signer chaque année.</EditableText>
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,.5)', marginTop: 20 }}>
                <EditableText k="landing.cdd.paragraphe" as="span" multiline>Comme en entreprise — la clarté des engagements, le bilan régulier, la révision des projets — mais avec amour. À la fin du programme, vous rédigez votre Contrat à Durée Déterminée de couple : vos articles, vos valeurs, vos projets. Avec un rendez-vous annuel inscrit dedans.</EditableText>
              </p>
              <ul className="mt-6 space-y-3">
                {CDD_POINTS.map((item, i) => (
                  <li key={item} className="flex gap-3 items-start">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.55)' }}>
                      <EditableText k={`landing.cdd.point${i}`} as="span">{item}</EditableText>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: '#1e1a15', borderRadius: 'var(--r-lg)', padding: '32px', border: '1px solid rgba(255,255,255,.08)' }}>
              <p className="font-mono text-center mb-1" style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Contrat à durée déterminée</p>
              <h3 className="font-serif text-center mb-6" style={{ fontSize: 22, color: 'rgba(255,255,255,.85)' }}>Le CDD de couple</h3>
              {[['Article 1', 'Engagement mutuel'], ['Article 2', 'Valeurs partagées'], ['Article 3', 'Projets communs'], ['Avenant', 'Bilan annuel'], ['Renouvellement', 'À re-signer chaque année']].map(([k, v], idx) => (
                <div key={k} className="flex justify-between py-3" style={{ borderBottom: idx < 4 ? '1px solid rgba(255,255,255,.07)' : 'none', fontSize: 13 }}>
                  <span className="font-mono uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', fontSize: 11 }}>{k}</span>
                  <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div className="flex justify-end mt-4">
                <div className="flex items-center justify-center text-center font-bold" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--brand)', color: 'white', fontSize: 11, lineHeight: 1.2 }}>
                  À re-signer<br />chaque<br />année
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="py-20" style={{ background: 'var(--cream-2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText k="landing.temoignages.eyebrow" as="span">Ils ont signé leur pacte</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText k="landing.temoignages.titre" as="span">Ce qu'ils ont vraiment changé.</EditableText>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TEMOIGNAGES.map((t, i) => (
              <div key={i} className="card p-6 flex flex-col">
                <div className="mb-3" style={{ color: 'var(--brand)', letterSpacing: 2, fontSize: 14 }}>★★★★★</div>
                <blockquote className="font-serif flex-1 mb-4" style={{ fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: 'var(--ink)' }}>
                  &laquo; <EditableText k={`landing.temoignages.${i}.texte`} as="span" multiline>{t.texte}</EditableText> &raquo;
                </blockquote>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    <EditableText k={`landing.temoignages.${i}.prenom`} as="span">{t.prenom}</EditableText>
                  </div>
                  <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    <EditableText k={`landing.temoignages.${i}.lieu`} as="span">{t.lieu}</EditableText>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="py-20" style={{ background: 'var(--paper)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText k="landing.tarifs.eyebrow" as="span">Tarifs</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText k="landing.tarifs.titre" as="span">Un seul achat. Une vie de rendez-vous.</EditableText>
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              <EditableText k="landing.tarifs.soustitre" as="span">Le module 1 est gratuit. Lancement le</EditableText> <strong style={{ color: 'var(--ink)' }}>1er septembre 2026</strong>.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="card p-6 flex flex-col gap-4">
              <div className="tag-muted self-start"><EditableText k="landing.offre1.tag" as="span">Découverte</EditableText></div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'var(--ink)' }}>0 <small style={{ fontSize: 18 }}>€</small></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText k="landing.offre1.souslabel" as="span">Module 1 gratuit · toujours</EditableText></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
              {OFFRE_GRATUITE.map((f, i) => (
                <div key={f} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><EditableText k={`landing.offre1.point${i}`} as="span">{f}</EditableText></span>
                </div>
              ))}
              <Link href="/inscription" className="btn-ghost text-center justify-center mt-auto"><EditableText k="landing.offre1.cta" as="span">Commencer gratuitement</EditableText></Link>
            </div>
            <div className="card p-6 flex flex-col gap-4" style={{ background: 'var(--brand)', border: 'none' }}>
              <div className="self-start px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                <EditableText k="landing.offre2.tag" as="span">Accès complet</EditableText>
              </div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'white' }}>89 <small style={{ fontSize: 18 }}>€</small></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}><EditableText k="landing.offre2.souslabel" as="span">paiement unique · accès à vie</EditableText></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)' }} />
              {OFFRE_COMPLETE.map((f, i) => (
                <div key={f} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.8)' }} />
                  <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.9)' }}><EditableText k={`landing.offre2.point${i}`} as="span">{f}</EditableText></span>
                </div>
              ))}
              <Link href="/inscription" className="mt-auto flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg" style={{ background: 'white', color: 'var(--brand)', fontSize: 14 }}>
                <EditableText k="landing.offre2.cta" as="span">Pré-inscription</EditableText> <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="card p-6 flex flex-col gap-4">
              <div className="tag-brand self-start"><EditableText k="landing.offre3.tag" as="span">Renouvellement</EditableText></div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'var(--ink)' }}>19 <small style={{ fontSize: 18 }}>€/an</small></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText k="landing.offre3.souslabel" as="span">module 10 · Le BAC love · à activer plus tard</EditableText></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
              {OFFRE_RENOUVELLEMENT.map((f, i) => (
                <div key={f} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><EditableText k={`landing.offre3.point${i}`} as="span">{f}</EditableText></span>
                </div>
              ))}
              <Link href="/inscription" className="btn-ghost text-center justify-center mt-auto"><EditableText k="landing.offre3.cta" as="span">Plus tard, dans l'app</EditableText></Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="eyebrow justify-center mb-4"><EditableText k="landing.ctafinal.eyebrow" as="span">Dernière étape</EditableText></div>
        <h2 className="font-serif text-4xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
          <EditableText k="landing.ctafinal.titre" as="span">Posez les bases. Maintenant.</EditableText>
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--muted)' }}>
          <EditableText k="landing.ctafinal.soustitre" as="span">Le module 1 est gratuit. Commencez à deux, ce soir.</EditableText>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/inscription" className="btn-brand lg">
            <EditableText k="landing.ctafinal.cta_principal" as="span">Pré-inscription — gratuite</EditableText> <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10" style={{ background: 'var(--ink)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="font-serif font-bold" style={{ color: 'var(--dark-paper)', fontSize: 20 }}>YES BOX</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>
              <EditableText k="landing.footer.tagline" as="span">Le pacte des couples qui tiennent</EditableText>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>© 2026 YES BOX · yesbox-lepacte.fr</div>
          <div className="flex gap-4 flex-wrap">
            <Link href="/connexion" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Connexion</Link>
            <Link href="/inscription" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Inscription</Link>
            <Link href="/tarifs" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Tarifs</Link>
            <Link href="/mentions-legales" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
