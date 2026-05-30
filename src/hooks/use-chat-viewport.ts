'use client'

import { useEffect, useState, type RefObject } from 'react'

type ChatViewportOptions = {
  containerRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
}

/**
 * Ancla un chat a pantalla completa al viewport VISIBLE en mobile, para que el
 * teclado virtual no desplace el layout (problema clásico de iOS Safari/PWA).
 *
 * En iOS el teclado NO encoge el layout viewport: lo PANEA hacia abajo
 * (`visualViewport.offsetTop` > 0) y encoge el viewport visible
 * (`visualViewport.height`). Un contenedor `position: fixed` queda anclado al
 * *layout* viewport, así que el paneo lo "sube" fuera de vista — el header y los
 * mensajes desaparecen y el input queda pegado arriba. La cura, la que usan los
 * chats reales (WhatsApp / ChatGPT web), es escribir en cada `resize` y `scroll`
 * del visualViewport, dentro de `requestAnimationFrame`:
 *
 *   height    = visualViewport.height                → la altura baja desde abajo
 *   transform = translate(offsetLeft, offsetTop)     → reancla al área visible
 *
 * El `offsetTop` (el paneo) es la pieza que faltaba: con solo la altura, el
 * `fixed` seguía subiéndose. En Android (`resizes-content`, el default) el
 * `offsetTop` es 0 y solo aplica la altura — el mismo código sirve sin ramas por
 * user-agent. Se activa únicamente bajo el breakpoint `sm` (donde el contenedor
 * es `fixed`); en ≥sm (layout estático centrado) limpia los estilos y no hace
 * nada. Escribe directo al DOM por `ref` (no `setState`) para no re-renderizar
 * en cada frame del teclado.
 */
export function useChatViewport({ containerRef, scrollerRef }: ChatViewportOptions) {
  // ¿El contenedor está en modo `fixed` a pantalla completa? Exactamente bajo el
  // breakpoint `sm` de Tailwind (640px) — así el JS nunca pelea con el CSS.
  const [fullscreen, setFullscreen] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)')
    const sync = () => setFullscreen(!mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    const vv = window.visualViewport
    if (!fullscreen || !el || !vv) return

    // Bloquea el scroll del documento: con el contenedor `fixed` no hay nada que
    // scrollear, pero esto frena el rubber-band de iOS y cualquier intento del
    // navegador de "revelar" el input desplazando la página entera.
    const { documentElement: html, body } = document
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    const NEAR_BOTTOM_PX = 64
    let frame = 0

    const apply = () => {
      frame = 0
      el.style.height = `${vv.height}px`
      el.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px)`
      // Convención de chat: si ya estábamos pegados al fondo, seguir pegados
      // cuando el teclado encoge el área. Si el usuario subió a leer (lejos del
      // fondo) no le robamos el scroll.
      const sc = scrollerRef.current
      if (sc && sc.scrollHeight - sc.scrollTop - sc.clientHeight <= NEAR_BOTTOM_PX) {
        sc.scrollTop = sc.scrollHeight
      }
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply)
    }

    apply()
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      el.style.height = ''
      el.style.transform = ''
    }
  }, [fullscreen, containerRef, scrollerRef])
}
