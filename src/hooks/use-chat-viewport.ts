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
 *  3. Suelta los valores del `visualViewport` en POCOS pasos discretos (no frame
 *     a frame), así que aplicarlos crudos se ve escalonado.
 *
 * El hook, en cada `apply()`:
 *  - height/transform = visualViewport.height / translate(offsetLeft, offsetTop),
 *    pero durante la ventana de abrir/cerrar con SEGUIMIENTO AMORTIGUADO (cada
 *    frame se acerca un % al valor real): funde los pasos de iOS en un glide
 *    continuo con sensación de peso, sin el lag fijo de una transición CSS.
 *  - lock fuerte (`body { position: fixed }`) + `scrollTo(0,0)` → `scrollY` en 0
 *  - fija el scroll de mensajes al FONDO al enfocar (ves el último mensaje).
 *
 * Al enfocar/desenfocar pollea cada frame durante la ventana (los eventos de iOS
 * no bastan) para avanzar la amortiguación. El breakpoint `sm` se chequea en
 * vivo; en desktop limpia estilos y suelta el lock.
 */
const DAMP = 0.3 // factor de acercamiento por frame (mayor = más snappy)

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
    let curHeight = vv.height
    let curOffTop = vv.offsetTop
    const apply = () => {
      if (desktopMql.matches) {
        unlock()
        el.style.height = ''
        el.style.transform = ''
        return
      }
      lock()
      if (window.scrollY !== 0) window.scrollTo(0, 0)
      const targetHeight = vv.height
      const targetOffTop = vv.offsetTop
      if (Date.now() < animateUntil) {
        curHeight += (targetHeight - curHeight) * DAMP
        curOffTop += (targetOffTop - curOffTop) * DAMP
        if (Math.abs(targetHeight - curHeight) < 0.5) curHeight = targetHeight
        if (Math.abs(targetOffTop - curOffTop) < 0.5) curOffTop = targetOffTop
      } else {
        curHeight = targetHeight
        curOffTop = targetOffTop
      }
      el.style.height = `${curHeight}px`
      el.style.transform = `translate(${vv.offsetLeft}px, ${curOffTop}px)`
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

    // Seguimiento denso durante la animación: pollea cada frame hasta `pollUntil`
    // para avanzar la amortiguación. `disposed` corta el loop al desmontar.
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
      // Al abrir: anima (amortiguado), fija el fondo y sigue denso.
      const now = Date.now()
      animateUntil = now + 650
      pinUntil = now + 700
      pollUntil = now + 700
      poll()
    }
    const onFocusOut = () => {
      // Al cerrar: anima el regreso a pantalla completa y sigue denso.
      const now = Date.now()
      animateUntil = now + 650
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
      el.style.height = ''
      el.style.transform = ''
    }
  }, [containerRef, scrollerRef])
}
