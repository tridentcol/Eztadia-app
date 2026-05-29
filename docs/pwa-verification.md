# Verificación PWA — Finanzia

Checklist para validar que la app instalada (standalone) se sienta idéntica al
browser, sin reflows ni elementos tapados por la status bar / home indicator.

## Tokens y mecanismos en juego

- `--topbar-h` / `--mobile-nav-h`: alturas del shell (globals.css).
- `--safe-top` / `--safe-bottom`: `env(safe-area-inset-*)`.
- `--topbar-total` / `--mobile-nav-total`: altura + inset, fuente de verdad de
  todos los sticky offsets y paddings del shell.
- `viewport-fit=cover` + `appleWebApp.statusBarStyle: black-translucent` en
  `src/app/layout.tsx` — requisito para que los insets resuelvan.
- `StandaloneDetector` → `<html data-standalone="true">` para overrides
  puntuales (hoy: `overscroll-behavior-y: none`).

## Build local

```
pnpm typecheck && pnpm lint && pnpm build && pnpm start
```

## iOS standalone (iPhone real, iOS 17+)

1. Borrar el ícono previo de Finanzia del home screen (evita cache del manifest).
2. Abrir el preview en Safari → Compartir → "Agregar a inicio".
3. Abrir desde el ícono (modo standalone).
4. Recorrer: `/dashboard`, `/mi-dinero/cuentas`, `/mi-dinero/movimientos`,
   `/mi-plan/presupuestos`, `/ajustes`.

Verificar en cada ruta:

- [ ] Topbar mantiene altura constante; el bg Noir cubre la status bar.
- [ ] Bottom-nav fija; FAB centrado vertical; items con espacio sano por
      encima de la home indicator.
- [ ] Sticky day-headers de movimientos quedan siempre debajo del topbar
      (nunca pisados por la status bar).
- [ ] Section-tabs y nav interno de ajustes anclados debajo del topbar.
- [ ] Inputs no provocan auto-zoom al recibir focus (font-size ≥16px mobile).
- [ ] Dialogs / sheets: header no tapado por el notch, footer no tapado por la
      home indicator. La altura usa `dvh`, sin overflow al ocultarse la URL bar.
- [ ] Command palette no se mete bajo el notch ni la home indicator.
- [ ] El pull en los bordes no revela fondo (overscroll cancelado).
- [ ] Navegar entre rutas no mueve ni redimensiona la topbar ni la bottom-nav.

## Android Chrome (sin notch)

- [ ] safe-area-inset = 0 no introduce gaps ni rompe layouts.
- [ ] "Instalar app" funciona; standalone se comporta igual que browser.

## Lighthouse

- [ ] PWA score ≥ 90 (manifest, theme-color, installable, viewport).
