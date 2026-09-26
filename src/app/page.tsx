'use client'

import { useState } from 'react'
import Link from 'next/link'
import YesBoxLogo from '@/components/YesBoxLogo'
import InscriptionModal from '@/components/InscriptionModal'
import OffresTarifs from '@/components/OffresTarifs'
import EditableText from '@/components/edit-mode/EditableText'
import { useLocale, useT } from '@/components/i18n/LocaleContext'
import { MODULES } from '@/lib/modules-data'
import { localizeModules } from '@/lib/i18n/module-text'
import { ArrowRight, Check, Menu, X } from 'lucide-react'


const TEMOIGNAGES = (t: (fr: string, en: string) => string) => [
  { texte: t("On a découvert des choses qu'on n'avait jamais osé dire après 4 ans ensemble. Le module sur les conflits nous a sauvés.", "We discovered things we'd never dared say after 4 years together. The module on conflict saved us."), prenom: 'Marie & Tom', lieu: 'Paris' },
  { texte: t("Notre CDD de couple est encadré dans notre salon. On le relit chaque anniversaire. C'est notre plus belle décision.", "Our Couple's Contract is framed in our living room. We reread it every anniversary. It's the best decision we've made."), prenom: 'Inès & Rémi', lieu: 'Lyon' },
  { texte: t('Je recommande à tous les couples qui veulent aller plus loin que le PACS. Une vraie préparation émotionnelle.', 'I recommend it to every couple who wants more than just a legal commitment. Real emotional preparation.'), prenom: 'Sophie & Lucas', lieu: 'Bordeaux' },
]

const POUR_QUI = (t: (fr: string, en: string) => string) => [
  { titre: t('Tout va bien, et vous voulez que ça dure', "Everything's fine, and you want it to last"), desc: t("Pas besoin d'une crise pour prendre soin de votre couple. Juste l'envie de mieux vous connaître.", "You don't need a crisis to take care of your relationship. Just the wish to get to know each other better.") },
  { titre: t('Il y a des non-dits', 'There are things left unsaid'), desc: t("De petites frustrations qui s'accumulent, des sujets qu'on évite, des conversations qu'on remet toujours à plus tard.", 'Small frustrations piling up, topics you avoid, conversations you keep putting off.') },
  { titre: t('Vos disputes tournent en rond', 'Your arguments go round in circles'), desc: t('Toujours les mêmes sujets, toujours la même fin. Vous voulez comprendre ce qui se joue et en sortir autrement.', "Always the same topics, always the same ending. You want to understand what's really going on and find another way out.") },
  { titre: t('Le quotidien a pris toute la place', 'Everyday life has taken over'), desc: t('Travail, tâches, écrans. Vous voulez retrouver du temps rien qu\'à deux et vous redécouvrir.', 'Work, chores, screens. You want to find time just for the two of you and rediscover each other.') },
  { titre: t('Un nouveau cap arrive', 'A new chapter is coming'), desc: t("Emménagement, achat commun, enfant, PACS, mariage : une étape qui mérite qu'on s'y prépare ensemble.", 'Moving in, buying a home, a child, a civil union, a wedding: a milestone worth preparing for together.') },
  { titre: t("Consulter, ce n'est pas (encore) pour vous", "Therapy isn't for you (yet)"), desc: t("Pas envie de raconter votre vie à une personne extérieure pour l'instant ? Commencez par vous parler, entre vous.", "Not ready to share your life with an outsider just yet? Start by talking to each other.") },
]

const NAV_LINKS = (t: (fr: string, en: string) => string) => [
  { href: '#forwhom', key: 'forwhom', label: t('Pour qui', "Who it's for") },
  { href: '#modules', key: 'modules', label: t('Les modules', 'The modules') },
  { href: '#tarifs', key: 'tarifs', label: t('Tarifs', 'Pricing') },
]

const OPTIONS = (t: (fr: string, en: string) => string) => [
  { titre: t('On ne dit rien', 'We say nothing'), desc: t("C'est gratuit… sur le moment. Les non-dits, eux, s'accumulent.", 'It costs nothing… in the moment. But the things left unsaid keep piling up.') },
  { titre: t('On achète un livre', 'We buy a book'), desc: t('Environ 20 €, souvent lu par un seul des deux membres du couple, et il faut tout transposer soi-même dans sa propre histoire.', "Around €20, often read by only one of the two partners, and you have to translate it all into your own story yourselves.") },
  { titre: t('On consulte', 'We see a therapist'), desc: t("C'est indispensable quand ça va vraiment mal. Il faut compter 80 à 150 € la séance, sur plusieurs mois. Tout le monde n'a pas envie de se confier à une personne extérieure dès le départ.", "It's essential when things are really bad. Expect €80 to €150 per session, over several months. And not everyone wants to confide in an outsider right from the start.") },
]

const CDD_LIST = (t: (fr: string, en: string) => string) => [
  t('Vos engagements, écrits noir sur blanc', 'Your commitments, in black and white'),
  t('Un bilan à votre date anniversaire, chaque année', 'A check-in on your anniversary, every year'),
  t('Un avenant pour évoluer ensemble, et re-signer « nous »', 'An amendment to grow together, and re-sign on "us"'),
]

const CDD_ROWS = (t: (fr: string, en: string) => string) => [
  { k: t('Article 1', 'Article 1'), v: t('Engagement mutuel', 'Mutual commitment') },
  { k: t('Article 2', 'Article 2'), v: t('Valeurs partagées', 'Shared values') },
  { k: t('Article 3', 'Article 3'), v: t('Projets communs', 'Shared plans') },
  { k: t('Avenant', 'Amendment'), v: t('Bilan annuel', 'Annual check-in') },
  { k: t('Renouvellement', 'Renewal'), v: t('À re-signer chaque année', 'Re-signed every year') },
]


export default function LandingPage() {
  const t = useT()
  const { locale } = useLocale()
  const [modalOpen, setModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const modules = localizeModules(MODULES, locale)
  const navLinks = NAV_LINKS(t)
  const pourQuiList = POUR_QUI(t)
  const optionsList = OPTIONS(t)
  const cddList = CDD_LIST(t)
  const cddRows = CDD_ROWS(t)
  const temoignagesList = TEMOIGNAGES(t)

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, key, label }) => (
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
              <EditableText id="home.nav.sinscrire">S&apos;inscrire</EditableText>
            </button>
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden space-y-3" style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)', padding: '16px 24px' }}>
            {navLinks.map(({ href, key, label }) => (
              <a key={href} href={href} className="block text-sm font-medium py-1" style={{ color: 'var(--ink)' }} onClick={() => setMenuOpen(false)}>
                <EditableText id={`home.nav.${key}`}>{label}</EditableText>
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/connexion" className="btn-ghost text-sm py-2 px-4 flex-1 justify-center">
                <EditableText id="home.nav.connexion.mobile">Connexion</EditableText>
              </Link>
              <button onClick={() => { setMenuOpen(false); setModalOpen(true) }} className="btn-brand text-sm py-2 px-4 flex-1 justify-center">
                <EditableText id="home.nav.sinscrire">S&apos;inscrire</EditableText>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6" style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          <EditableText id="home.hero.title.line1">Le pacte des couples</EditableText><br />
          <EditableText id="home.hero.title.line2" as="em" style={{ color: 'var(--brand)' }}>qui tiennent.</EditableText>
        </h1>
        <div className="text-lg md:text-xl max-w-2xl mx-auto mb-10 space-y-3" style={{ color: 'var(--muted)' }}>
          <p><EditableText id="home.hero.intro.0" multiline>Les non-dits s&apos;accumulent sans bruit. YES BOX vous aide à les poser sur la table, sans thérapeute et sans pression.</EditableText></p>
          <p><EditableText id="home.hero.intro.1" multiline>Des modules simples et ludiques pour parler de ce qui compte : ce qui va bien, ce qui coince, et ce qu&apos;on n&apos;a pas encore osé se dire.</EditableText></p>
          <p><EditableText id="home.hero.intro.2" multiline>Pour tous les couples, à votre rythme.</EditableText></p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <button onClick={() => setModalOpen(true)} className="btn-brand lg">
            <EditableText id="home.hero.cta.primary">Inscription au module 1 — Gratuit</EditableText> <ArrowRight className="w-4 h-4" />
          </button>
          <a href="#modules" className="btn-ghost lg">
            <EditableText id="home.hero.cta.secondary">Voir le programme</EditableText>
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--muted)' }}>
          {/* Identifiants fixes : nouveaux ids pour les badges dont le texte a changé. */}
          {([['gratuit', '✦ Module 1 entièrement gratuit pour vous deux'], ['sansjugement', '✦ Sans thérapeute, sans jugement'], [3, '✦ Résiliable à tout moment']] as const).map(([i, badge]) => (
            <span key={i}><EditableText id={`home.hero.badges.${i}`}>{badge}</EditableText></span>
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
            <p className="mt-3 text-base" style={{ color: 'var(--muted)' }}>
              <EditableText id="home.pourqui.subtitle">Ensemble depuis 2 mois ou 20 ans, en union libre, en PACS ou en mariage.</EditableText>
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pourQuiList.map((item, i) => (
              <div key={item.titre} className="card p-6 flex gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--sage-soft)' }}>
                  <Check className="w-3.5 h-3.5" style={{ color: 'var(--sage)' }} />
                </span>
                <div>
                  <h4 className="font-semibold mb-1.5" style={{ fontSize: 15 }}><EditableText id={`home.pourqui.v2.${i}.titre`}>{item.titre}</EditableText></h4>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}><EditableText id={`home.pourqui.v2.${i}.desc`} multiline>{item.desc}</EditableText></p>
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
            <h2 className="font-serif" style={{ fontSize: 'clamp(24px, 3.2vw, 34px)', lineHeight: 1.25, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>
              <EditableText id="home.constat.titre">Un couple ne se sépare pas en un jour.</EditableText>
            </h2>
            <div className="space-y-3" style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--muted)' }}>
              <p><EditableText id="home.constat.texte.0" multiline>Il se sépare à force de petites choses jamais dites.</EditableText></p>
              <p><EditableText id="home.constat.texte.1" multiline>Une frustration qu&apos;on garde pour soi, un sujet qu&apos;on évite, une dispute qu&apos;on ne termine jamais vraiment.</EditableText></p>
              <p><EditableText id="home.constat.texte.2" multiline>Une à une, elles ne pèsent rien. Accumulées pendant des années, elles finissent par tout peser.</EditableText></p>
            </div>
            <div className="card p-6 flex gap-5 items-center mt-8">
              <div className="font-serif font-bold flex-shrink-0" style={{ fontSize: 36, color: 'var(--brand)', lineHeight: 1 }}><EditableText id="home.constat.chiffre.n">45 %</EditableText></div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}><EditableText id="home.constat.chiffre.l" multiline>des mariages se terminent par un divorce (Insee, 2022).</EditableText></div>
            </div>
          </div>
          <div>
            <h3 className="font-serif mb-5" style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>
              <EditableText id="home.constat.options.titre">Et quand ça coince, on fait quoi ?</EditableText>
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {optionsList.map((o, i) => (
                <div key={i} className="card p-6">
                  <h4 className="font-semibold mb-1.5" style={{ fontSize: 15, color: 'var(--ink)' }}><EditableText id={`home.constat.options.${i}.titre`}>{o.titre}</EditableText></h4>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 }}><EditableText id={`home.constat.options.${i}.desc`} multiline>{o.desc}</EditableText></p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card mt-12 p-8 md:p-10 text-center" style={{ maxWidth: 820, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 className="font-serif mb-5" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.25 }}>
            <EditableText id="home.constat.reveal.titre" as="em" style={{ color: 'var(--brand)' }}>Il manquait un rendez-vous régulier, à deux.</EditableText>
          </h3>
          <div className="space-y-3" style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--muted)' }}>
            <p><EditableText id="home.constat.reveal.texte.0" multiline>YES BOX part d&apos;une idée simple : un couple, ça se choisit, puis ça se re-choisit.</EditableText></p>
            <p><EditableText id="home.constat.reveal.texte.1" multiline>À la fin du programme, vous signez votre CDD de couple, votre pacte pour l&apos;année qui vient.</EditableText></p>
            <p><EditableText id="home.constat.reveal.texte.2" multiline>Chaque année, comme en entreprise, un module vous aide à faire le bilan, à dire ce qui a pesé et à ajuster vos engagements.</EditableText></p>
            <p><EditableText id="home.constat.reveal.texte.3" multiline>Vous ne perdez jamais le fil, et les frustrations n&apos;ont pas le temps de s&apos;installer.</EditableText></p>
          </div>
          <p className="font-serif mt-6" style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)' }}>
            <EditableText id="home.constat.reveal.chute" multiline>Et si tout va bien ? C&apos;est justement le meilleur moment pour commencer.</EditableText>
          </p>
          <p className="mt-6" style={{ fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--muted)' }}>
            <EditableText id="home.constat.reveal.avertissement" multiline>YES BOX n&apos;est pas une thérapie. Si vous traversez une crise profonde, tournez-vous vers un·e professionnel·le. Et pour toute situation de violence, contactez le 3919 ou le numéro des urgences 17, 112 ou par SMS au 114 (contact gratuit).</EditableText>
          </p>
        </div>
      </section>

      {/* LES 10 MODULES */}
      <section id="modules" className="py-20" style={{ background: 'var(--cream-2)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="eyebrow justify-center mb-3"><EditableText id="home.modules.eyebrow">Le programme</EditableText></div>
            <h2 className="font-serif text-3xl font-bold" style={{ color: 'var(--ink)' }}>
              <EditableText id="home.modules.title.line1">Neuf modules pour poser les bases.</EditableText><br />
              <EditableText id="home.modules.title.line2">Un dixième pour les faire durer.</EditableText>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {modules.map((m, i) => {
              return (
              <div key={m.slug} className="card flex items-center gap-5 p-5">
                <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: 'var(--brand)', width: 28 }}>{String(m.n).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-serif font-bold" style={{ fontSize: 18, color: 'var(--ink)' }}><EditableText id={`module.${m.slug}.titre`}>{m.titre}</EditableText></span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}><EditableText id={`module.${m.slug}.sousTitre`}>{m.sousTitre}</EditableText></span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}><EditableText id={`module.${m.slug}.description`} multiline>{m.description}</EditableText></p>
                </div>
                {m.free && <span className="tag-sage flex-shrink-0">{t('Gratuit', 'Free')}</span>}
                {m.n === 10 && <span className="tag-muted flex-shrink-0">{t('Annuel', 'Yearly')}</span>}
              </div>
            )})}
          </div>
          <div className="text-center" style={{ maxWidth: 680, margin: '40px auto 0', fontSize: 14.5, lineHeight: 1.7, color: 'var(--muted)' }}>
            <p>
              <EditableText id="home.modules.duree" multiline>Chaque module compte entre 10 et 15 questions. À deux, il faut compter entre 30 et 60 minutes, en fonction des discussions qui vont en découler. Il faut donc y dédier 9 petits bouts de soirée.</EditableText>
            </p>
            <p style={{ marginTop: 8 }}>
              <EditableText id="home.modules.infos.prefix">Pour plus d&apos;informations, lire les</EditableText>{' '}
              <Link href="/mentions-legales" style={{ color: 'var(--brand)', textDecoration: 'underline' }}><EditableText id="home.modules.infos.link">mentions légales</EditableText></Link>.
            </p>
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
                {cddList.map((item, i) => (
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
              {cddRows.map((row, idx) => (
                <div key={idx} className="flex justify-between py-3" style={{ borderBottom: idx < cddRows.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none', fontSize: 13 }}>
                  <span className="font-mono uppercase" style={{ color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', fontSize: 11 }}><EditableText id={`home.cdd.card.rows.${idx}.k`}>{row.k}</EditableText></span>
                  <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 500 }}><EditableText id={`home.cdd.card.rows.${idx}.v`}>{row.v}</EditableText></span>
                </div>
              ))}
              <div className="flex justify-end mt-4">
                <div className="flex items-center justify-center text-center font-bold" style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--brand)', color: 'white', fontSize: 11, lineHeight: 1.2 }}>
                  {t('À re-signer', 'Renewed')}<br />{t('chaque', 'every')}<br />{t('année', 'year')}
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
            {temoignagesList.map((item, i) => (
              <div key={i} className="card p-6 flex flex-col">
                <div className="mb-3" style={{ color: 'var(--brand)', letterSpacing: 2, fontSize: 14 }}>★★★★★</div>
                <blockquote className="font-serif flex-1 mb-4" style={{ fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: 'var(--ink)' }}>
                  &laquo; <EditableText id={`home.temoignages.${i}.texte`} multiline>{item.texte}</EditableText> &raquo;
                </blockquote>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}><EditableText id={`home.temoignages.${i}.prenom`}>{item.prenom}</EditableText></div>
                  <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}><EditableText id={`home.temoignages.${i}.lieu`}>{item.lieu}</EditableText></div>
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
              <EditableText id="home.tarifs.subtitle">Le module 1 est gratuit pour vous deux, jusqu&apos;à la révélation.</EditableText>
            </p>
          </div>
          <OffresTarifs onInscription={() => setModalOpen(true)} />
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
            <EditableText id="home.ctafinal.cta">Commencer maintenant</EditableText> <ArrowRight className="w-4 h-4" />
          </button>
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
            <button onClick={() => setModalOpen(true)} style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.inscription">Inscription</EditableText></button>
            <Link href="/tarifs" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.tarifs">Tarifs</EditableText></Link>
            <Link href="/mentions-legales" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.mentions">Mentions légales</EditableText></Link>
            <Link href="/confidentialite" style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}><EditableText id="home.footer.link.confidentialite">Confidentialité</EditableText></Link>
            <Link href="/admin" style={{ color: 'rgba(255,255,255,.35)', fontSize: 12 }}>Admin</Link>
          </div>
        </div>
      </footer>

      {modalOpen && <InscriptionModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
