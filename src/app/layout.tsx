import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Inter, Geist_Mono, Fraunces, Sora } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import { Toaster } from 'sonner'

import './globals.css'
import { clerkAppearance } from '@/lib/clerk-appearance'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider, type Theme } from '@/components/app/theme-provider'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
})

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

// Fraunces italic — uso parsimonioso. Solo para empty states y onboarding.
const fraunces = Fraunces({
  variable: '--font-editorial',
  subsets: ['latin'],
  display: 'swap',
  style: ['italic'],
  weight: ['400', '500'],
})

// Sora — exclusiva para el wordmark de marca. No usar fuera del lockup.
const sora = Sora({
  variable: '--font-brand',
  subsets: ['latin'],
  display: 'swap',
  weight: ['500'],
})

export const metadata: Metadata = {
  title: {
    default: 'finanzia',
    template: '%s · finanzia',
  },
  description: 'Finanzas personales con IA.',
  appleWebApp: {
    capable: true,
    title: 'finanzia',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0B' },
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
  ],
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Lee la cookie del tema server-side para aplicar la clase inicial al
  // <html> y evitar flash entre modo claro/oscuro durante hidratación.
  const cookieStore = await cookies()
  const stored = cookieStore.get('finanzia_theme')?.value
  const theme: Theme = stored === 'light' ? 'light' : 'dark'
  const isDark = theme === 'dark'

  return (
    <html
      lang="es"
      className={`${isDark ? 'dark ' : ''}${inter.variable} ${geistMono.variable} ${fraunces.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider initialTheme={theme}>
          <ClerkProvider appearance={clerkAppearance} localization={esES}>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </ClerkProvider>
          <Toaster
            theme={theme}
            position="top-center"
            offset={20}
            toastOptions={{
              classNames: {
                toast:
                  'border-border-default bg-surface-elevated text-text rounded-[12px] border shadow-none',
                description: 'text-text-secondary',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
