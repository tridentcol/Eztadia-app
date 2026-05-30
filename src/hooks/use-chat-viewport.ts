'use client'

import { useEffect, type RefObject } from 'react'

type ChatViewportOptions = {
  containerRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
}

/**
 * Maneja el teclado virtual en el chat a pantalla completa sin mover el layout
 * (problema clásico de iOS Safari/PWA), con la BARRA SUPERIOR siempre estática.
 *
 * Enfoque: el contenedor ocupa SIEMPRE toda la pantalla (`fixed inset-0`, fondo
 * bg-surface, alto fijo = layout viewport). NUNCA cambia de tamaño ni se traslada
 * → el header no se mueve y nunca hay huecos vacíos. El teclado se maneja con un
 * `padding-bottom` igual a su alto (`clientHeight - visualViewport.height`): eso
 * sube el input (último hijo flex) justo encima del teclado, mientras el área del
 * padding (bg-surface) queda detrás del teclado.
 *
 * Clave para que iOS NO panee (lo que hacía "scrollear" la barra superior): al
 * enfocar subimos el input PREVENTIVAMENTE al alto de teclado ya conocido, ANTES
 * de que iOS mida la posición del input. Si el input ya está sobre el teclado,
 * iOS no necesita panear (`offsetTop` se queda en 0) y no movemos nada.
 *
 * Refuerzos: lock fuerte (`body { position: fixed }`) + `scrollTo(0,0)` para que
 * el documento no se desplace; fija el scroll de mensajes al fondo al enfocar;
 * poll por frame durante la animación (los eventos de iOS son escasos). El
 * breakpoint `sm` se chequea en vivo; en desktop limpia estilos y suelta el lock.
 */
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
    let preemptUntil = 0
    let lastInset = 0 // último alto de teclado conocido (para subir preventivo)

    const pinScroller = () => {
      const sc = scrollerRef.current
      if (!sc) return
      const nearBottom = sc.scrollHeight - sc.scrollTop - sc.clientHeight <= 64
      if (Date.now() < pinUntil || nearBottom) sc.scrollTop = sc.scrollHeight
    }

    const apply = () => {
      if (desktopMql.matches) {
        unlock()
        el.style.paddingBottom = ''
        return
      }
      lock()
      if (window.scrollY !== 0) window.scrollTo(0, 0)
      const inset = Math.max(0, Math.round(html.clientHeight - vv.height))
      if (inset > 0) lastInset = inset
      // Mientras iOS aún no abre el teclado (inset 0) pero acabamos de enfocar,
      // mantenemos el input subido al alto conocido → iOS no panea.
      const target = Date.now() < preemptUntil && inset === 0 ? lastInset : inset
      el.style.paddingBottom = `${target}px`
      pinScroller()
    }

    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        apply()
      })
    }

    // Sigue la animación nativa del teclado frame a frame durante la ventana.
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
      // Sube el input PREVENTIVAMENTE (sincrónico, antes de que iOS mida) al alto
      // de teclado conocido, para que iOS no panee y la barra superior no se mueva.
      const now = Date.now()
      preemptUntil = now + 350
      pinUntil = now + 700
      pollUntil = now + 700
      if (!desktopMql.matches && lastInset > 0) {
        lock()
        el.style.paddingBottom = `${lastInset}px`
        pinScroller()
      }
      poll()
    }
    const onFocusOut = () => {
      preemptUntil = 0
      pollUntil = Date.now() + 700
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
      el.style.paddingBottom = ''
    }
  }, [containerRef, scrollerRef])
}
