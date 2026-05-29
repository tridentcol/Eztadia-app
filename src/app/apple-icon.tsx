import { ImageResponse } from 'next/og'

/**
 * apple-touch-icon generado a build time — iOS espera PNG cuadrado
 * 180×180 con fondo opaco. SVG no es suficiente para algunos devices
 * antiguos. Next 16 detecta este archivo y lo expone en
 * /apple-icon.png con el link tag correcto.
 *
 * Diseño Horizonte: tres arcos morados sobre el bg Noir, idéntico al
 * favicon. Padding generoso (~18%) para evitar que iOS recorte cuando
 * aplica la máscara de bordes redondeados del sistema.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0B',
        }}
      >
        <svg
          width="124"
          height="124"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 18 140 A 82 82 0 0 1 182 140 L 168 140 A 68 68 0 0 0 32 140 Z"
            fill="#7C3AED"
          />
          <path
            d="M 48 140 A 52 52 0 0 1 152 140 L 138 140 A 38 38 0 0 0 62 140 Z"
            fill="#7C3AED"
          />
          <path
            d="M 78 140 A 22 22 0 0 1 122 140 Z"
            fill="#4C1D95"
          />
        </svg>
      </div>
    ),
    size,
  )
}
