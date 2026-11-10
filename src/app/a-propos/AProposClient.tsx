'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import YesBoxLogo from '@/components/YesBoxLogo'
import EditableText from '@/components/edit-mode/EditableText'
import { useT } from '@/components/i18n/LocaleContext'

// Page « À propos » : l'histoire de YES BOX, de la White Box (coffret
// matériel) au programme en ligne. Textes modifiables en mode édition
// (ids « apropos.… », version anglaise dans EN_CONTENT).

const eyebrow = 'font-mono uppercase'
const eyebrowStyle = { fontSize: 12, letterSpacing: '.3em', color: 'var(--brand)' }
const h2 = 'font-serif font-bold'
const h2Style = { fontSize: 'clamp(26px, 4.5vw, 38px)', lineHeight: 1.15, color: 'var(--ink)' }
const texteStyle = { fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)' }
const citationStyle = { fontSize: 'clamp(20px, 3.4vw, 26px)', lineHeight: 1.4, color: 'var(--ink-2)' }

function Photo({ src, alt, largeur, hauteur }: { src: string; alt: string; largeur: number; hauteur: number }) {
  return (
    <figure className="bg-white p-3 sm:p-4" style={{ boxShadow: '0 10px 30px rgba(26,24,22,.10)' }}>
      <Image src={src} alt={alt} width={largeur} height={hauteur} className="w-full h-auto block" sizes="(max-width: 768px) 100vw, 720px" />
    </figure>
  )
}

export default function AProposClient({ connecte }: { connecte: boolean }) {
  const t = useT()
  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(251,248,243,0.92)', borderColor: 'var(--line)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <YesBoxLogo size="sm" />
          <Link href="/" className="btn-ghost text-sm py-2 px-4">← {t('Accueil', 'Home')}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14 space-y-20">
        {/* Titre */}
        <div>
          <div className={`${eyebrow} mb-4`} style={eyebrowStyle}><EditableText id="apropos.eyebrow">À propos</EditableText></div>
          <h1 className="font-serif font-bold" style={{ fontSize: 'clamp(34px, 6vw, 54px)', lineHeight: 1.1, color: 'var(--ink)' }}>
            <EditableText id="apropos.titre">De la White Box à YES BOX</EditableText>
          </h1>
        </div>

        {/* 1. Wedding planner : Cérémonies & Compagnie */}
        <section className="space-y-6">
          <div className={eyebrow} style={eyebrowStyle}><EditableText id="apropos.histoire.eyebrow">Il y a plus de dix ans</EditableText></div>
          <h2 className={h2} style={h2Style}><EditableText id="apropos.histoire.titre">J’étais wedding planner.</EditableText></h2>
          <Image src="/a-propos/logo-ceremonies-et-compagnie.png" alt="Cérémonies & Compagnie" width={1211} height={201} className="h-auto" style={{ width: 'min(100%, 420px)', mixBlendMode: 'multiply' }} />
          <p style={texteStyle}>
            <EditableText id="apropos.histoire.metier" multiline>Avec Cérémonies & Compagnie, j’organisais des mariages et j’écrivais des cérémonies laïques sur mesure. Pour chaque couple, tout commençait par de longues conversations : leur histoire, ce qui les avait réunis, ce qu’ils voulaient se promettre.</EditableText>
          </p>
          <Photo src="/a-propos/ceremonies-laiques.jpg" alt={t('Cérémonies & Compagnie : une cérémonie laïque en plein air et des décorations de mariage', 'Cérémonies & Compagnie: an outdoor secular ceremony and wedding decorations')} largeur={740} hauteur={492} />
          <Photo src="/a-propos/mariages-organises.jpg" alt={t('Cérémonies & Compagnie : tables, fleurs et détails de mariages organisés', 'Cérémonies & Compagnie: tables, flowers and details from weddings I organized')} largeur={771} hauteur={495} />
          <p style={texteStyle}>
            <EditableText id="apropos.histoire.constat" multiline>J’ai vu combien ces échanges comptaient, parfois plus que le jour J lui-même. Ils méritaient d’exister au-delà de la cérémonie.</EditableText>
          </p>
        </section>

        {/* 2. The White Box */}
        <section className="space-y-6">
          <Photo src="/a-propos/fondatrice-white-box.jpg" alt={t('Lise, fondatrice de YES BOX, tenant un coffret The White Box', 'Lise, founder of YES BOX, holding a The White Box gift box')} largeur={860} hauteur={564} />
          <p className="font-serif italic" style={citationStyle}><EditableText id="apropos.histoire.texte">Et j’ai créé la White Box.</EditableText></p>
          <div className={eyebrow} style={eyebrowStyle}><EditableText id="apropos.coffret.eyebrow">The White Box</EditableText></div>
          <h2 className={h2} style={h2Style}><EditableText id="apropos.coffret.titre.v2">Un coffret de préparation au mariage.</EditableText></h2>
          <div className="grid sm:grid-cols-2 gap-6 items-center">
            <Photo src="/a-propos/coffrets-white-box.jpg" alt={t('Des piles de coffrets The White Box', 'Stacks of The White Box gift boxes')} largeur={600} hauteur={600} />
            <Photo src="/a-propos/coffret-ouvert.jpg" alt={t('Un coffret The White Box ouvert : cartes de questions, bougie et cœur rouge', 'An open The White Box: question cards, a candle and a red heart')} largeur={749} hauteur={534} />
          </div>
          <p style={texteStyle}>
            <EditableText id="apropos.coffret.texte.v2" multiline>Pour aider les couples à se préparer et à réfléchir ensemble à leur engagement : des cartes de questions, une bougie, et du temps rien qu’à deux.</EditableText>
          </p>
        </section>

        {/* 3. Renaissance en ligne */}
        <section className="space-y-6 text-center">
          <p className="font-serif italic" style={citationStyle}><EditableText id="apropos.renait.avant">Autrefois matérielle…</EditableText></p>
          <h2 className={h2} style={h2Style}><EditableText id="apropos.renait.titre">aujourd’hui, elle renaît en ligne.</EditableText></h2>
          <div className="flex justify-center py-4"><YesBoxLogo size="lg" /></div>
          <p className="text-left" style={texteStyle}>
            <EditableText id="apropos.renait.texte" multiline>YES BOX – Le Pacte est un programme en ligne de développement personnel pour tous les couples, ensemble depuis 2 mois ou 20 ans, marié·es ou non. En 8 modules à faire à deux et à son rythme, chacun·e répond de son côté avant de découvrir les réponses de l’autre et d’en parler, pour consolider sa relation et renforcer son engagement. À la fin, un pacte de couple à signer, à renouveler chaque année pour se redire oui, en conscience.</EditableText>
          </p>
        </section>

        {/* 4. Pourquoi */}
        <section className="space-y-6">
          <div className={eyebrow} style={eyebrowStyle}><EditableText id="apropos.pourquoi.eyebrow">Pourquoi</EditableText></div>
          <h2 className={h2} style={h2Style}><EditableText id="apropos.pourquoi.titre">Parce que les non-dits et le quotidien prennent vite toute la place.</EditableText></h2>
          <div style={{ width: 80, height: 3, background: 'var(--ink-2)' }} />
          <div>
            <p className="font-serif italic" style={citationStyle}><EditableText id="apropos.pourquoi.avant">YES BOX aide les couples à prendre soin de leur relation et à se redire</EditableText></p>
            <p className="font-serif font-bold" style={{ fontSize: 'clamp(80px, 18vw, 150px)', lineHeight: 1, color: 'var(--brand)' }}><EditableText id="apropos.pourquoi.oui">OUI</EditableText></p>
            <p className="font-serif italic" style={citationStyle}><EditableText id="apropos.pourquoi.apres">en conscience, chaque année.</EditableText></p>
          </div>
          <p className="font-serif" style={{ fontSize: 17, color: 'var(--ink-2)' }}>— <EditableText id="apropos.signature">Lise, fondatrice de YES BOX</EditableText></p>
        </section>

        {/* Appel à l'action */}
        <section className="card p-8 text-center space-y-4">
          <p className="font-serif font-bold" style={{ fontSize: 22, color: 'var(--ink)' }}><EditableText id="apropos.cta.titre">Le premier module est gratuit.</EditableText></p>
          <Link href={connecte ? '/tableau-de-bord' : '/inscription'} className="btn-brand lg inline-flex">
            {connecte ? t('Mon espace', 'My space') : t('Commencer à deux', 'Start together')} <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  )
}
