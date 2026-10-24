

function politiqueContenu() {
  const dev = process.env.NODE_ENV !== 'production'
  return [
    "default-src 'self'",
    // Next.js insère des scripts en ligne ; Cloudflare Turnstile (anti-robot).
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Supabase (connexion depuis le navigateur), Turnstile.
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
    'frame-src https://challenges.cloudflare.com',
    "frame-ancestors 'none'",
    // Paiement : redirection vers Stripe Checkout.
    "form-action 'self' https://checkout.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
    'report-uri /api/csp-report',
  ].join('; ')
}

const securityHeaders = [
  // Empêche d'afficher le site dans une iframe d'un autre site (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Politique de sécurité du contenu, en mode observation : rien n'est
  // bloqué, les écarts sont signalés à /api/csp-report (journaux Vercel).
  // À passer en « Content-Security-Policy » une fois les journaux propres.
  { key: 'Content-Security-Policy-Report-Only', value: politiqueContenu() },
]

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      // Import du fichier « Mes données » (réponses de tout un couple).
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
