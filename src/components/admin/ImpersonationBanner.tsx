import { Eye } from 'lucide-react'
import { adminStopViewAs } from '@/app/actions/admin'

export default function ImpersonationBanner({ prenom, email }: { prenom: string | null; email: string }) {
  return (
    <div style={{ background: 'var(--dark, #1a1816)', color: 'white' }}>
      <div className="flex items-center justify-center gap-3 flex-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 24px', fontSize: 12.5 }}>
        <Eye className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Mode admin — vous voyez l&apos;espace de <strong>{prenom || email}</strong></span>
        <form action={adminStopViewAs}>
          <button type="submit" className="underline font-semibold" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 'inherit' }}>
            Quitter
          </button>
        </form>
      </div>
    </div>
  )
}
