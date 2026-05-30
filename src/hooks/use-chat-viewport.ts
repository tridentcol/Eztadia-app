'use client'

import { useEffect, type RefObject } from 'react'

type ChatViewportOptions = {
  containerRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
}

/**
 * Ancla un chat a pantalla completa al viewport VISIBLE en mobile, para que el
 * teclado virtual no desplace el layout (problema clásico de iOS Safari/PWA).
 *
 * Medido en dispositivo real, iOS al enfocar el input:
 *  1. Panea y encoge el viewport visible (`visualViewport.offsetTop` > 0,
 *     `height` baja). `dvh/svh/lvh` NO reaccionan al teclado → se mide por JS.
 *  2. Scrollea el DOCUMENTO (`scrollY` > 0) para "revelar" el input, y
 *     `overflow:hidden` no lo frena → arrastra al contenedor `fixed` hacia arriba.
 *  3. Dispara los eventos del `visualViewport` de forma ESCASA durante la
 *     animación → si solo reaccionas a eventos, el chat sube "a saltos".
 *
 * Por eso el hook, en cada `apply()`:
 *  - height    = visualViewport.height                  → encoge desde abajo
 *  - transform = translate(offsetLeft, offsetTop)        → reancla al área visible
 *  - lock fuerte (`body { position: fixed }`) + `scrollTo(0,0)` → `scrollY` en 0
 *  - fija el scroll de mensajes al FONDO al enfocar (convención de chat: al abrir
 *    el teclado ves el último mensaje encima de él)
 *
 * Suavidad: iOS suelta los valores del `visualViewport` en POCOS pasos discretos
 * (no frame a frame), así que aplicarlos crudos se ve escalonado. Durante la
 * ventana de abrir/cerrar activamos una transición CSS corta (Noir easing, casi
 * idéntico a la curva del teclado iOS) sobre `height`/`transform`: interpola esos
 * pasos en un glide continuo. Fuera de la ventana se quita para no meter lag.
 *
 * Al enfocar/desenfocar hace SEGUIMIENTO DENSO: pollea cada frame durante la
 * ventana para no perder ningún valor, además de escuchar resize/scroll. El
 * breakpoint `sm` se chequea en vivo; en desktop limpia estilos y suelta el lock.
 */
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const TRANSITION = `height 220ms ${EASE}, transform 220ms ${EASE}`
export function useChatViewport({ containerRef, scrollerRef }: ChatViewportOptions) {
  useEffect(() => {
    const el = containerRef.current
    const vv = window.visualViewport
    if (!el || !vv) return

    const desktopMql = window.matchMedia('(min-width: 640px)')
    const html = document.documentElement
    const body = document.body
    const saved = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    }

    let locked = false
    const lock = () => {
      if (locked) return
      locked = true
      html.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = '0'
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
      body.style.overflow = 'hidden'
    }
    const unlock = () => {
      if (!locked) return
      locked = false
      html.style.overflow = saved.htmlOverflow
      body.style.position = saved.bodyPosition
      body.style.top = saved.bodyTop
      body.style.left = saved.bodyLeft
      body.style.right = saved.bodyRight
      body.style.width = saved.bodyWidth
      body.style.overflow = saved.bodyOverflow
    }

    let pinUntil = 0
    let animateUntil = 0
    const apply = () => {
      if (desktopMql.matches) {
        unlock()
        el.style.transition = ''
        el.style.height = ''
        el.style.transform = ''
        return
      }
      lock()
      if (window.scrollY !== 0) window.scrollTo(0, 0)
      // Transición solo durante la ventana de abrir/cerrar: suaviza los pasos
      // discretos de iOS en un glide; fuera de la ventana se quita (sin lag).
      el.style.transition = Date.now() < animateUntil ? TRANSITION : ''
      el.style.height = `${vv.height}px`
      el.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px)`
      const sc = scrollerRef.current
      if (sc) {
        const nearBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight <= 64
        if (Date.now() < pinUntil || nearBottom) sc.scrollTop = sc.scrollHeight
      }
    }

    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        apply()
      })
    }

    // Seguimiento denso durante la animación del teclado (los eventos de iOS no
    // bastan): pollea cada frame hasta `pollUntil`. `disposed` corta el loop al
    // desmontar.
    let pollUntil = 0
    let polling = false
    let disposed = false
    const poll = () => {
      if (polling) return
      polling = true
      const loop = () => {
        if (disposed) {
          polling = false
          return
        }
        apply()
        if (Date.now() < pollUntil) {
          window.requestAnimationFrame(loop)
        } else {
          polling = false
        }
      }
      window.requestAnimationFrame(loop)
    }

    const onFocusIn = () => {
      // Al abrir: anima, fija el fondo (ver el último mensaje) y sigue denso.
      const now = Date.now()
      animateUntil = now + 520
      pinUntil = now + 700
      pollUntil = now + 700
      poll()
    }
    const onFocusOut = () => {
      // Al cerrar: anima el regreso a pantalla completa y sigue denso.
      const now = Date.now()
      animateUntil = now + 520
      pollUntil = now + 700
      poll()
    }

    apply()
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    window.addEventListener('orientationchange', onFocusIn)
    return () => {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('orientationchange', onFocusIn)
      unlock()
      el.style.transition = ''
      el.style.height = ''
      el.style.transform = ''
    }
  }, [containerRef, scrollerRef])
}
