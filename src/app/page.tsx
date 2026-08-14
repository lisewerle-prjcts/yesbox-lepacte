'use client'

import { useState } from 'react'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import PrecommandeModal from '@/components/PrecommandeModal'
import EditableText from '@/components/edit-mode/EditableText'
import { MODULES } from '@/lib/modules-data'
import { ArrowRight, Check, Menu, X, User, Users, Heart, MessageCircle, Zap, FileText, RefreshCw } from 'lucide-react'

const MODULE_ICONS = [User, Users, Heart, MessageCircle, Zap, FileText, RefreshCw]

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

const NAV_LINKS = [
  { href: '#forwhom', key: 'forwhom', label: 'Pour qui' },
  { href: '#modules', key: 'modules', label: 'Les modules' },
  { href: '#tarifs', key: 'tarifs', label: 'Tarifs' },
]

const STATS = [
  { n: '45 %', l: 'des mariages se terminent par un divorce en France' },
  { n: '68 %', l: "des disputes portent sur des sujets jamais abordés avant l'engagement" },
  { n: '0 h', l: 'de préparation conjugale en moyenne, hors mariage religieux' },
]

const CDD_LIST = [
  'Vos engagements, écrits noir sur blanc',
  'Un bilan à votre date anniversaire, chaque année',
  'Un avenant pour évoluer ensemble, et re-signer « nous »',
]

const CDD_ROWS = [
  { k: 'Article 1', v: 'Engagement mutuel' },
  { k: 'Article 2', v: 'Valeurs partagées' },
  { k: 'Article 3', v: 'Projets communs' },
  { k: 'Avenant', v: 'Bilan annuel' },
  { k: 'Renouvellement', v: 'À re-signer chaque année' },
]

const FREE_FEATURES = ['Module "Moi et toi" pour chaque membre', 'Questions personnelles', 'Espace couple privé']
const PRO_FEATURES = ['Les 7 modules complets', 'Sessions de révélation à deux', 'Score de connivence & journal', 'Votre CDD de couple', 'Garantie 30 jours']
const BAC_FEATURES = ['Rappel annuel à votre anniversaire', 'Fiche avenant générée', 'Refaites tous les modules si vous le souhaitez', 'Annulable à tout moment']

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, key, label }) => (
              <a key={href} href={href} className="text-sm font-medium transition-colors" style={{ color: 'var(--muted)' }}>
                <EditableText id={`home.nav.${key}`}>{label}</EditableText>
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/connexion" className="btn-ghost text-sm py-2 px-4">
              <EditableText id="home.nav.seconnecter">Se connecter</EditableText>
            </Link>
            <button onClick={() => setModalOpen(true)} className="btn-brand text-sm py-2 px-4">
              <EditableText id="home.nav.sinscrire">Inscription</EditableText>
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden space-y-3" style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '16px 24px' }}>
            {NAV_LINKS.map(({ href, key, label }) => (
              <a key={href} href={href} className="block text-sm font-medium py-1" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>
                <EditableText id={`home.nav.${key}`}>{label}</EditableText>
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/connexion" className="btn-ghost text-sm py-2 px-4 flex-1 justify-center">
                <EditableText id="home.nav.connexion.mobile">Connexion</EditableText>
              </Link>
              <button onClick={() => { setModalOpen(true); setMenuOpen(false) }} className="btn-brand text-sm py-2 px-4 flex-1 justify-center">
                <EditableText id="home.nav.sinscrire">Inscription</EditableText>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="tag-brand mb-6 mx-auto w-fit">
          <EditableText id="home.hero.badge">✦ Lancement le 1er septembre 2026</EditableText>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          <EditableText id="home.hero.title.line1">Le pacte des couples</EditableText><br />
          <EditableText id="home.hero.title.line2" as="em" style={{ color: 'var(--brand)' }}>qui tiennent.</EditableText>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--muted)' }}>
          <EditableText id="home.hero.subtitle" multiline>Un programme en 7 modules pour se choisir en conscience, signer votre CDD de couple, et vous retrouver chaque année.</EditableText>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <button onClick={() => setModalOpen(true)} className="btn-brand lg">
            <EditableText id="home.hero.cta.primary">Inscription au module 1 — Gratuit</EditableText> <ArrowRight className="w-4 h-4" />
          </button>
          <a href="#modules" className="btn-ghost lg">
            <EditableText id="home.hero.cta.secondary">Voir le programme</EditableText>
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          {['✦ Module 1 gratuit pour vous deux', '✦ À votre rythme', '✦ Lancement 1er sept. 2026', '✦ Résiliable à tout moment'].map((t, i) => (
            <span key={i}><EditableText id={`home.hero.badges.${i}`}>{t}</EditableText></span>
          ))}
        </div>
      </section>

      {/* POUR QUI */}
      <section id="forwhom" className="py-20" style={{ background: 'var(--paper)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText id="home.pourqui.eyebrow">Pour qui</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText id="home.pourqui.title.prefix">Ce programme est fait pour</EditableText>{' '}
              <EditableText id="home.pourqui.title.highlight" as="em" style={{ color: 'var(--brand)' }}>vous deux</EditableText>
              <EditableText id="home.pourqui.title.suffix">, si…</EditableText>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POUR_QUI.map((item, i) => (
              <div key={item.titre} className="card p-6 flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--sage-soft)' }}>
                  <Check className="w-3.5 h-3.5" style={{ color: 'var(--sage)' }} />
                </span>
                <div>
                  <h4 className="font-semibold mb-1.5" style={{ fontSize: 15 }}><EditableText id={`home.pourqui.${i}.titre`}>{item.titre}</EditableText></h4>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}><EditableText id={`home.pourqui.${i}.desc`} multiline>{item.desc}</EditableText></p>
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
            <div className="eyebrow mb-4"><EditableText id="home.constat.eyebrow">Le constat</EditableText></div>
            <blockquote className="font-serif" style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1.35, color: 'var(--ink)', marginBottom: 20, fontStyle: 'italic' }}>
              &ldquo;<EditableText id="home.constat.quote" multiline>On organise un mariage pendant 18 mois. On prépare le couple pendant… combien ?</EditableText>&rdquo;
            </blockquote>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--muted)' }}>
              <EditableText id="home.constat.paragraph.prefix">La plupart des couples s&apos;engagent</EditableText>{' '}
              <EditableText id="home.constat.paragraph.highlight" as="em">sans avoir pris le temps de poser les bases</EditableText>
              <EditableText id="home.constat.paragraph.suffix" multiline>. On parle de robe, de salle, de menu, de musique. Mais rarement de finances, de désir d&apos;enfants, de famille, de rythme, de silences.</EditableText>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="card p-6 flex gap-5 items-center">
                <div className="font-serif font-bold flex-shrink-0" style={{ fontSize: 36, color: 'var(--brand)', lineHeight: 1 }}><EditableText id={`home.constat.stats.${i}.n`}>{s.n}</EditableText></div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}><EditableText id={`home.constat.stats.${i}.l`} multiline>{s.l}</EditableText></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LES 7 MODULES */}
      <section id="modules" className="py-20" style={{ background: 'var(--cream-2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText id="home.modules.eyebrow">Le programme</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText id="home.modules.title.line1">Six modules pour poser les bases.</EditableText><br />
              <EditableText id="home.modules.title.line2">Un septième pour les faire durer.</EditableText>
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
                    <span className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}><EditableText id={`module.${m.slug}.titre`}>{m.titre}</EditableText></span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id={`module.${m.slug}.sousTitre`}>{m.sousTitre}</EditableText></span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}><EditableText id={`module.${m.slug}.description`} multiline>{m.description}</EditableText></p>
                </div>
                {m.free && <span className="tag-sage flex-shrink-0">Gratuit</span>}
                {m.n === 7 && <span className="tag-muted flex-shrink-0">Annuel</span>}
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
                <EditableText id="home.cdd.eyebrow">— L&apos;idée signature</EditableText>
              </div>
              <h2 className="font-serif" style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, color: 'rgba(255,255,255,.92)', lineHeight: 1.15 }}>
                <EditableText id="home.cdd.title.prefix">Un</EditableText>{' '}
                <EditableText id="home.cdd.title.highlight" as="em" style={{ color: 'var(--brand)', fontStyle: 'italic' }}>CDD de couple</EditableText>,<br />
                <EditableText id="home.cdd.title.suffix">à re-signer chaque année.</EditableText>
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,.5)', marginTop: 20 }}>
                <EditableText id="home.cdd.paragraph" multiline>Comme en entreprise — la clarté des engagements, le bilan régulier, la révision des projets — mais avec amour. À la fin du programme, vous rédigez votre Contrat à Durée Déterminée de couple : vos articles, vos valeurs, vos projets. Avec un rendez-vous annuel inscrit dedans.</EditableText>
              </p>
              <ul className="mt-6 space-y-3">
                {CDD_LIST.map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.55)' }}><EditableText id={`home.cdd.list.${i}`}>{item}</EditableText></span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: '#1e1a15', borderRadius: 'var(--r-lg)', padding: '32px', border: '1px solid rgba(255,255,255,.08)' }}>
              <p className="font-mono text-center mb-1" style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
                <EditableText id="home.cdd.card.eyebrow">Contrat à durée déterminée</EditableText>
              </p>
              <h3 className="font-serif text-center mb-6" style={{ fontSize: 22, color: 'rgba(255,255,255,.85)' }}>
                <EditableText id="home.cdd.card.title">Le CDD de couple</EditableText>
              </h3>
              {CDD_ROWS.map((row, idx) => (
                <div key={idx} className="flex justify-between py-3" style={{ borderBottom: idx < CDD_ROWS.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none', fontSize: 13 }}>
                  <span className="font-mono uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', fontSize: 11 }}><EditableText id={`home.cdd.card.rows.${idx}.k`}>{row.k}</EditableText></span>
                  <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 500 }}><EditableText id={`home.cdd.card.rows.${idx}.v`}>{row.v}</EditableText></span>
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
            <div className="eyebrow justify-center mb-3"><EditableText id="home.temoignages.eyebrow">Ils ont signé leur pacte</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}><EditableText id="home.temoignages.title">Ce qu&apos;ils ont vraiment changé.</EditableText></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TEMOIGNAGES.map((t, i) => (
              <div key={i} className="card p-6 flex flex-col">
                <div className="mb-3" style={{ color: 'var(--brand)', letterSpacing: 2, fontSize: 14 }}>★★★★★</div>
                <blockquote className="font-serif flex-1 mb-4" style={{ fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: 'var(--ink)' }}>
                  &laquo; <EditableText id={`home.temoignages.${i}.texte`} multiline>{t.texte}</EditableText> &raquo;
                </blockquote>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}><EditableText id={`home.temoignages.${i}.prenom`}>{t.prenom}</EditableText></div>
                  <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}><EditableText id={`home.temoignages.${i}.lieu`}>{t.lieu}</EditableText></div>
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
            <div className="eyebrow justify-center mb-3"><EditableText id="home.tarifs.eyebrow">Tarifs</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText id="home.tarifs.title">Un abonnement simple. Une vie de rendez-vous.</EditableText>
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              <EditableText id="home.tarifs.subtitle.prefix">Le module 1 est gratuit pour vous deux, jusqu&apos;à la révélation. Lancement le</EditableText>{' '}
              <strong style={{ color: 'var(--ink)' }}><EditableText id="home.tarifs.subtitle.date">1er septembre 2026</EditableText></strong>.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="card p-6 flex flex-col gap-4">
              <div className="tag-muted self-start"><EditableText id="home.tarifs.free.tag">Découverte</EditableText></div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'var(--ink)' }}>0 <small style={{ fontSize: 18 }}>€</small></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="home.tarifs.free.desc">Module 1 gratuit · pour vous deux · jusqu&apos;à la révélation</EditableText></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
              {FREE_FEATURES.map((f, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><EditableText id={`home.tarifs.free.features.${i}`}>{f}</EditableText></span>
                </div>
              ))}
              <Link href="/inscription" className="btn-ghost text-center justify-center mt-auto">
                <EditableText id="home.tarifs.free.cta">Commencer gratuitement</EditableText>
              </Link>
            </div>
            <div className="card p-6 flex flex-col gap-4" style={{ background: 'var(--brand)', border: 'none' }}>
              <div className="self-start px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.2)', color: 'white' }}>
                <EditableText id="home.tarifs.pro.tag">Accès complet</EditableText>
              </div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'white' }}>29 <small style={{ fontSize: 18 }}>€/mois</small></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}><EditableText id="home.tarifs.pro.desc">abonnement · résiliable à tout moment</EditableText></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,.2)' }} />
              {PRO_FEATURES.map((f, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,.8)' }} />
                  <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.9)' }}><EditableText id={`home.tarifs.pro.features.${i}`}>{f}</EditableText></span>
                </div>
              ))}
              <button onClick={() => setModalOpen(true)} className="mt-auto flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-lg" style={{ background: 'white', color: 'var(--brand)', fontSize: 14 }}>
                <EditableText id="home.tarifs.pro.cta">Pré-commander</EditableText> <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="card p-6 flex flex-col gap-4">
              <div className="tag-brand self-start"><EditableText id="home.tarifs.bac.tag">BAC annuel</EditableText></div>
              <div>
                <div className="font-serif font-bold" style={{ fontSize: 36, color: 'var(--ink)' }}>19 <small style={{ fontSize: 18 }}>€/an</small></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}><EditableText id="home.tarifs.bac.desc">Bilan Annuel de Couple · à activer plus tard</EditableText></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)' }} />
              {BAC_FEATURES.map((f, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--sage)' }} />
                  <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}><EditableText id={`home.tarifs.bac.features.${i}`}>{f}</EditableText></span>
                </div>
              ))}
              <Link href="/inscription" className="btn-ghost text-center justify-center mt-auto">
                <EditableText id="home.tarifs.bac.cta">Plus tard, dans l&apos;app</EditableText>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="eyebrow justify-center mb-4"><EditableText id="home.ctafinal.eyebrow">Dernière étape</EditableText></div>
        <h2 className="font-serif text-4xl font-bold mb-4" style={{ color: 'var(--ink)' }}>
          <EditableText id="home.ctafinal.title">Posez les bases. Maintenant.</EditableText>
        </h2>
        <p className="text-lg mb-8" style={{ color: 'var(--muted)' }}><EditableText id="home.ctafinal.subtitle" multiline>Le module 1 est gratuit pour vous deux. Commencez à deux, ce soir.</EditableText></p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button onClick={() => setModalOpen(true)} className="btn-brand lg">
            <EditableText id="home.ctafinal.cta.primary">Pré-commander — 29€/mois</EditableText> <ArrowRight className="w-4 h-4" />
          </button>
          <Link href="/inscription" className="btn-ghost lg">
            <EditableText id="home.ctafinal.cta.secondary">Essayer gratuitement</EditableText>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10" style={{ background: 'var(--ink)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="font-serif font-bold" style={{ color: 'var(--dark-paper)', fontSize: 20 }}>YES BOX</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>
              <EditableText id="home.footer.tagline">Le pacte des couples qui tiennent</EditableText>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}><EditableText id="home.footer.copyright">© 2026 YES BOX · yesbox-lepacte.fr</EditableText></div>
          <div className="flex gap-4 flex-wrap">
            <Link href="/connexion" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.connexion">Connexion</EditableText></Link>
            <Link href="/inscription" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.inscription">Inscription</EditableText></Link>
            <Link href="/tarifs" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.tarifs">Tarifs</EditableText></Link>
            <Link href="/mentions-legales" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.mentions">Mentions légales</EditableText></Link>
            <Link href="/admin" style={{ color: 'rgba(255,255,255,.35)', fontSize: 12 }}>Admin</Link>
          </div>
        </div>
      </footer>

      {modalOpen && <PrecommandeModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
