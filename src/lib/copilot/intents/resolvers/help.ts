import 'server-only'

import type { IntentResolver } from '../types'

export const resolveHelp: IntentResolver = async () => {
  return {
    intro: 'Esto es lo que puedo responder sobre tus finanzas:',
    blocks: [
      {
        type: 'list',
        items: [
          { primary: 'Tu saldo', secondary: '"¿cuánto tengo?", "saldo de mi débito"' },
          { primary: 'En qué gastas', secondary: '"¿cuánto gasté en mercado este mes?"' },
          { primary: 'Presupuestos', secondary: '"¿cómo voy con los presupuestos?"' },
          { primary: 'Pagos próximos', secondary: '"¿qué se viene esta semana?"' },
          { primary: 'Comparar y proyectar', secondary: '"¿gasté más que el mes pasado?", "¿cuánto me dura?"' },
          { primary: 'Buscar', secondary: '"busca pagos a Uber"' },
        ],
      },
    ],
  }
}
