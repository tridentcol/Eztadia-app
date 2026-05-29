'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (next: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const COOKIE_NAME = 'finanzia_theme'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 año

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function persistTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

/**
 * Provider que sincroniza la clase `.dark` del <html> con un estado
 * persistido en cookie. El layout server-side lee la cookie y aplica la
 * clase inicial para evitar flicker. Aquí solo manejamos los cambios.
 */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme
  children: ReactNode
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  // Si el browser cambia el theme via otra pestaña (storage event no
  // funciona con cookies), reaplica al mount por si la cookie cambió.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    persistTheme(next)
  }, [])

  const toggle = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      persistTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider.')
  }
  return ctx
}
