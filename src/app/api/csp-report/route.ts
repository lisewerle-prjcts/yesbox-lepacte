import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Signalements de la politique de sécurité du contenu (en mode observation,
// cf. next.config.mjs) : notés dans les journaux Vercel pour repérer ce
// qu'il faudrait autoriser avant de la rendre bloquante.
export async function POST(req: Request) {
  try {
    const texte = (await req.text()).slice(0, 4000)
    const json = JSON.parse(texte) as Record<string, unknown> | Record<string, unknown>[]
    const rapports = (Array.isArray(json) ? json.map(r => r.body) : [json['csp-report']]) as Record<string, unknown>[]
    for (const r of rapports.filter(Boolean).slice(0, 5)) {
      const directive = r['violated-directive'] ?? r['effectiveDirective'] ?? r['effective-directive']
      const bloque = r['blocked-uri'] ?? r['blockedURL']
      const page = r['document-uri'] ?? r['documentURL']
      console.warn(`[csp] ${String(directive)} — ${String(bloque)} — page ${String(page)}`)
    }
  } catch {
    // Rapport illisible : ignoré.
  }
  return new NextResponse(null, { status: 204 })
}
