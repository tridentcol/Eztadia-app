import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
]

// Reorganización IA v2 (2026-05-28): páginas migradas a 4 secciones posesivas.
// `permanent: true` emite HTTP 308 — query strings se preservan por defecto
// (e.g. /transacciones?day=2026-05-28 → /mi-dinero/movimientos?day=2026-05-28).
const iaRedirects = [
  { source: '/cuentas', destination: '/mi-dinero/cuentas', permanent: true },
  { source: '/cuentas/:path*', destination: '/mi-dinero/cuentas/:path*', permanent: true },
  { source: '/transacciones', destination: '/mi-dinero/movimientos', permanent: true },
  { source: '/transacciones/:path*', destination: '/mi-dinero/movimientos/:path*', permanent: true },
  { source: '/deudas', destination: '/mi-dinero/deudas', permanent: true },
  { source: '/deudas/:path*', destination: '/mi-dinero/deudas/:path*', permanent: true },
  { source: '/presupuestos', destination: '/mi-plan/presupuestos', permanent: true },
  { source: '/presupuestos/:path*', destination: '/mi-plan/presupuestos/:path*', permanent: true },
  { source: '/metas', destination: '/mi-plan/metas', permanent: true },
  { source: '/metas/:path*', destination: '/mi-plan/metas/:path*', permanent: true },
  { source: '/ahorro', destination: '/mi-plan/ahorro', permanent: true },
  { source: '/ahorro/:path*', destination: '/mi-plan/ahorro/:path*', permanent: true },
  { source: '/cash-flow', destination: '/mi-plan/cash-flow', permanent: true },
  { source: '/cash-flow/:path*', destination: '/mi-plan/cash-flow/:path*', permanent: true },
  { source: '/ajustes/recurring', destination: '/mi-plan/recurrentes', permanent: true },
  { source: '/ajustes/recurring/:path*', destination: '/mi-plan/recurrentes/:path*', permanent: true },
  { source: '/insights', destination: '/mi-historia/insights', permanent: true },
  { source: '/insights/:path*', destination: '/mi-historia/insights/:path*', permanent: true },
  { source: '/informes', destination: '/mi-historia/informes', permanent: true },
  { source: '/informes/:path*', destination: '/mi-historia/informes/:path*', permanent: true },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return iaRedirects
  },
}

export default nextConfig
