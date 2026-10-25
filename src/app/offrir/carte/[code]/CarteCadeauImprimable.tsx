import type { CarteCadeau } from '@/lib/cartes-cadeaux'
import { estCarteYesBox, formaterDateCarte } from '@/lib/cartes-cadeaux'
import { t as traduire, type Locale } from '@/lib/i18n/locale'

// Visuel de la carte cadeau (modèle « Carte cadeau — YES BOX »), au format
// A5 paysage : les tailles en cqw suivent la largeur de la carte, à l'écran
// comme à l'impression. À l'impression (ou « Enregistrer au format PDF »),
// seule la carte apparaît, sur une page A5 paysage.
const STYLE_IMPRESSION = `
  @page { size: A5 landscape; margin: 0; }
  .carte-imprimable { container-type: inline-size; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: white !important; height: 148mm !important; overflow: hidden !important; }
    body * { visibility: hidden; }
    .pas-imprime { display: none !important; }
    .carte-imprimable, .carte-imprimable * { visibility: visible; }
    .carte-imprimable { position: absolute !important; left: 0; top: 0; width: 210mm !important; height: 148mm !important; max-width: none !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
  }
`
export default function CarteCadeauImprimable({ carte, locale }: {
  carte: Pick<CarteCadeau, 'code' | 'duree_mois' | 'pour_soi' | 'de_la_part_de' | 'pour_qui' | 'expire_le'>
  locale: Locale
}) {
  const t = (fr: string, en: string) => traduire(locale, fr, en)
  const [prenom1, prenom2] = (carte.pour_qui ?? '').split(' & ')
  const libelle = 'font-mono uppercase'
  const libelleStyle = { fontSize: '1.35cqw', letterSpacing: '.28em', color: '#5f5953' }
  const ligne = { borderBottom: '1px solid #a8a198', minHeight: '4.6cqw', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '.6cqw' } as const

  return (
    <>
      <style>{STYLE_IMPRESSION}</style>
      <div className="carte-imprimable mx-auto" style={{ width: '100%', maxWidth: '210mm', aspectRatio: '210 / 148', background: '#f9f6f1', boxShadow: '0 20px 50px -30px rgba(26,24,22,.45)', borderRadius: 6, overflow: 'hidden', position: 'relative', display: 'flex', color: '#1a1816' }}>
        {/* Liseré rayé */}
        <div style={{ width: '2.4cqw', flexShrink: 0, background: 'repeating-linear-gradient(135deg, #c5256e 0 1cqw, #f9f6f1 1cqw 2cqw)' }} />

        {/* Colonne gauche */}
        <div style={{ width: '40%', padding: '5cqw 4cqw 4cqw 5.5cqw', display: 'flex', flexDirection: 'column' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-yesbox.svg" alt="" style={{ width: '22cqw', height: '22cqw', marginLeft: '-1cqw' }} />
          <div className="font-serif" style={{ fontSize: '6.4cqw', fontWeight: 900, lineHeight: 1, marginTop: '1.5cqw', letterSpacing: '-.02em' }}>YES BOX</div>
          <div className={libelle} style={{ ...libelleStyle, marginTop: '2.2cqw', lineHeight: 1.7 }}>{t('Le pacte des couples qui tiennent', 'The pact for couples built to last')}</div>
          <div style={{ width: '6cqw', height: 2, background: '#c5256e', margin: '2.6cqw 0' }} />
          <p className="font-serif italic" style={{ fontSize: '1.85cqw', lineHeight: 1.45, color: '#2b2724' }}>
            {t('Des soirées à deux pour mieux se connaître, mieux se parler et choisir de s’engager.', 'Evenings for two to get to know each other better, talk better and choose to commit.')}
          </p>
        </div>

        <div style={{ width: 1, background: '#d8d1c5', margin: '5.5cqw 0' }} />

        {/* Colonne droite */}
        <div style={{ flex: 1, padding: '5.5cqw 5cqw 4cqw 4.5cqw', display: 'flex', flexDirection: 'column' }}>
          <div className="font-mono uppercase" style={{ fontSize: '1.6cqw', letterSpacing: '.32em', color: '#c5256e', fontWeight: 500 }}>{t('Carte cadeau', 'Gift card')}</div>

          <div className={libelle} style={{ ...libelleStyle, marginTop: '3cqw' }}>{t('Pour vous deux', 'For the two of you')}</div>
          <div style={ligne}>
            <span className="font-serif" style={{ fontSize: '2.3cqw' }}>
              {prenom1 || ''} <span className="italic" style={{ fontSize: '3cqw', margin: '0 1cqw' }}>&amp;</span> {prenom2 || ''}
            </span>
          </div>

          {!carte.pour_soi && (
            <>
              <div className={libelle} style={{ ...libelleStyle, marginTop: '2.8cqw' }}>{t('De la part de', 'From')}</div>
              <div style={ligne}><span className="font-serif" style={{ fontSize: '2.3cqw' }}>{carte.de_la_part_de ?? ''}</span></div>
            </>
          )}

          <div className={libelle} style={{ ...libelleStyle, marginTop: '2.8cqw' }}>{t('Votre cadeau', 'Your gift')}</div>
          {estCarteYesBox(carte.duree_mois) ? (
            <div style={{ marginTop: '1.2cqw', display: 'flex', alignItems: 'baseline', gap: '1.2cqw' }}>
              <span className="font-serif" style={{ fontSize: '4.6cqw', fontWeight: 800, color: '#c5256e', lineHeight: 1 }}>YES BOX</span>
              <span style={{ fontSize: '1.85cqw', lineHeight: 1.35 }}>
                {t('le parcours complet jusqu’à votre pacte, pendant 1 an', 'the full program up to your pact, for 1 year')}
              </span>
            </div>
          ) : (
            <div style={{ marginTop: '1.2cqw', display: 'flex', alignItems: 'baseline', gap: '1.2cqw' }}>
              <span className="font-serif" style={{ fontSize: '4.6cqw', fontWeight: 800, color: '#c5256e', lineHeight: 1 }}>{carte.duree_mois}</span>
              <span style={{ fontSize: '1.85cqw', lineHeight: 1.35 }}>
                {t('mois d’abonnement au programme YES BOX – Le Pacte', `month${carte.duree_mois > 1 ? 's' : ''} of subscription to the YES BOX – Le Pacte program`)}
              </span>
            </div>
          )}

          <div className={libelle} style={{ ...libelleStyle, marginTop: '2.8cqw' }}>{t('Code cadeau', 'Gift code')}</div>
          <div className="font-mono" style={{ marginTop: '1cqw', alignSelf: 'flex-start', border: '2px dashed #c5256e', borderRadius: '1.2cqw', background: 'white', padding: '1cqw 2.6cqw', fontSize: '3cqw', letterSpacing: '.14em', fontWeight: 500 }}>
            {carte.code}
          </div>

          <p style={{ fontSize: '1.6cqw', marginTop: '2.2cqw' }}>
            {t('Activez votre code sur', 'Activate your code at')} <span className="font-mono" style={{ color: '#c5256e', fontWeight: 500 }}>yesbox-lepacte.fr</span>
          </p>
          <p style={{ fontSize: '1.5cqw', color: '#5f5953', marginTop: '.6cqw' }}>
            {t(`Valable jusqu’au ${formaterDateCarte(carte.expire_le, locale)}`, `Valid until ${formaterDateCarte(carte.expire_le, locale)}`)}
          </p>
        </div>
      </div>
    </>
  )
}
