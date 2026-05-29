import type { MetadataRoute } from 'next'

/**
 * PWA manifest mínimo — habilita "Add to Home Screen" en iOS y Android
 * y le da a Finanzia identidad como app instalada (nombre, color de
 * splash, modo standalone sin barra del browser).
 *
 * theme_color y background_color usan el `bg` Noir (#0A0A0B). Cuando
 * el usuario instala la app, el splash y la status bar respiran el
 * mismo negro denso del producto.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'finanzia',
    short_name: 'finanzia',
    description: 'Finanzas personales con IA.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0B',
    theme_color: '#0A0A0B',
    lang: 'es-CO',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
