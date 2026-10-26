import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

// Image de partage (Open Graph et carte « summary_large_image ») : LinkedIn,
// WhatsApp, Facebook, X… Générée une fois au build, reprise par toutes les pages.
export const alt = 'YES BOX — Le pacte des couples qui tiennent'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), 'public/logo-yesbox.svg'), 'utf8')
  const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 96px', background: '#fbf8f3', borderBottom: '16px solid #c5256e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={120} height={120} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 76, fontWeight: 700, color: '#1a1816', letterSpacing: '-0.02em' }}>YES BOX</div>
            <div style={{ fontSize: 26, color: '#c5256e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Le pacte des couples qui tiennent</div>
          </div>
        </div>
        <div style={{ marginTop: 56, fontSize: 40, color: '#3b3733', lineHeight: 1.3, maxWidth: 960 }}>
          Parlez de ce qui compte, sans thérapeute et sans pression, puis écrivez votre pacte de couple.
        </div>
        <div style={{ marginTop: 36, display: 'flex', fontSize: 28, color: '#c5256e', fontWeight: 700 }}>Module 1 gratuit · www.yesbox-lepacte.fr</div>
      </div>
    ),
    size,
  )
}
