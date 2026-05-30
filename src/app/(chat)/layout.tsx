import { requireCurrentUser } from '@/lib/auth'

/**
 * Layout del copiloto a pantalla completa. Fuera del shell de (app) — sin
 * topbar/sidebar/bottom-nav — para que el chat ocupe toda la pantalla como un
 * chat LLM normal. Auth igual que (app): requireCurrentUser redirige si no hay
 * sesión. El ClerkProvider y el Toaster viven en el root layout.
 */
export default async function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireCurrentUser()
  return <div className="bg-background">{children}</div>
}
