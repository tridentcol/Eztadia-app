/**
 * Golden set de categorización — casos LATAM (es-CO) con la categoría esperada.
 *
 * Sirve para medir la calidad del motor de categorización (kNN + fallback LLM)
 * con datos en vez de mover los umbrales (0.85 / 0.60 / 0.55) a ciegas. El
 * runner vive en `scripts/eval-categorization.ts` (necesita keys + DB); este
 * archivo es solo el dataset + el catálogo de nombres válidos para el test de
 * buena-formación en CI.
 *
 * `expected` es el NOMBRE de la categoría del sistema (el modelo no usa slugs).
 * Mantener en sync con `scripts/seed-categories.ts`.
 */

export type CategorizationCase = {
  description: string
  merchant: string | null
  kind: 'income' | 'expense' | 'transfer'
  expected: string
}

/** Nombres canónicos de las categorías del sistema (mirror de seed-categories). */
export const SYSTEM_CATEGORY_NAMES: readonly string[] = [
  // income
  'Salario', 'Freelance', 'Inversiones', 'Reembolsos', 'Regalos', 'Otros ingresos',
  // expense
  'Vivienda', 'Arriendo o hipoteca', 'Servicios públicos', 'Internet', 'Administración',
  'Mantenimiento del hogar', 'Alimentación', 'Mercado', 'Restaurantes', 'Café', 'Domicilios',
  'Transporte', 'Combustible', 'Transporte público', 'Movilidad', 'Mantenimiento vehicular',
  'Parqueaderos y peajes', 'Salud', 'Médicos y especialistas', 'Medicamentos', 'Seguros de salud',
  'Educación', 'Cursos y formación', 'Libros', 'Suscripciones educativas', 'Entretenimiento',
  'Streaming', 'Salidas', 'Cine y cultura', 'Conciertos y eventos', 'Compras', 'Ropa', 'Hogar',
  'Electrónica', 'Cuidado personal', 'Belleza', 'Gimnasio', 'Servicios', 'Telefonía',
  'Suscripciones', 'Seguros', 'Hijos', 'Mascotas', 'Viajes', 'Donaciones', 'Impuestos',
  'Otros gastos',
  // transfer
  'Transferencia entre cuentas', 'Pago de tarjeta',
]

export const CATEGORIZATION_GOLDEN: CategorizationCase[] = [
  // Domicilios / comida a domicilio
  { description: 'Pedido Rappi almuerzo', merchant: 'Rappi', kind: 'expense', expected: 'Domicilios' },
  { description: 'iFood cena', merchant: 'iFood', kind: 'expense', expected: 'Domicilios' },
  { description: 'DiDi Food', merchant: 'DiDi Food', kind: 'expense', expected: 'Domicilios' },

  // Movilidad
  { description: 'Viaje Uber al trabajo', merchant: 'Uber', kind: 'expense', expected: 'Movilidad' },
  { description: 'Carrera DiDi', merchant: 'DiDi', kind: 'expense', expected: 'Movilidad' },
  { description: 'Cabify aeropuerto', merchant: 'Cabify', kind: 'expense', expected: 'Movilidad' },

  // Transporte público
  { description: 'Recarga TransMilenio', merchant: 'TransMilenio', kind: 'expense', expected: 'Transporte público' },
  { description: 'Pasaje metro Medellín', merchant: 'Metro de Medellín', kind: 'expense', expected: 'Transporte público' },

  // Combustible
  { description: 'Tanqueada gasolina', merchant: 'Terpel', kind: 'expense', expected: 'Combustible' },
  { description: 'Gasolina EDS Primax', merchant: 'Primax', kind: 'expense', expected: 'Combustible' },

  // Mercado
  { description: 'Compra mercado quincena', merchant: 'Éxito', kind: 'expense', expected: 'Mercado' },
  { description: 'Mercado Carulla', merchant: 'Carulla', kind: 'expense', expected: 'Mercado' },
  { description: 'Compra D1', merchant: 'D1', kind: 'expense', expected: 'Mercado' },
  { description: 'Tienda Ara', merchant: 'Ara', kind: 'expense', expected: 'Mercado' },

  // Restaurantes / Café
  { description: 'Almuerzo Crepes & Waffles', merchant: 'Crepes & Waffles', kind: 'expense', expected: 'Restaurantes' },
  { description: "McDonald's combo", merchant: "McDonald's", kind: 'expense', expected: 'Restaurantes' },
  { description: 'Café Juan Valdez', merchant: 'Juan Valdez', kind: 'expense', expected: 'Café' },
  { description: 'Tinto Tostao', merchant: 'Tostao', kind: 'expense', expected: 'Café' },

  // Streaming
  { description: 'Suscripción Netflix', merchant: 'Netflix', kind: 'expense', expected: 'Streaming' },
  { description: 'Disney Plus mensual', merchant: 'Disney+', kind: 'expense', expected: 'Streaming' },
  { description: 'Spotify Premium', merchant: 'Spotify', kind: 'expense', expected: 'Streaming' },

  // Telefonía / Internet / Servicios públicos
  { description: 'Plan celular Claro', merchant: 'Claro', kind: 'expense', expected: 'Telefonía' },
  { description: 'Recarga Tigo', merchant: 'Tigo', kind: 'expense', expected: 'Telefonía' },
  { description: 'Internet hogar ETB', merchant: 'ETB', kind: 'expense', expected: 'Internet' },
  { description: 'Factura energía EPM', merchant: 'EPM', kind: 'expense', expected: 'Servicios públicos' },
  { description: 'Pago acueducto y alcantarillado', merchant: null, kind: 'expense', expected: 'Servicios públicos' },

  // Salud
  { description: 'Compra medicamentos Cruz Verde', merchant: 'Cruz Verde', kind: 'expense', expected: 'Medicamentos' },
  { description: 'Farmacia La Rebaja', merchant: 'La Rebaja', kind: 'expense', expected: 'Medicamentos' },
  { description: 'Mensualidad EPS Sura', merchant: 'Sura', kind: 'expense', expected: 'Seguros de salud' },

  // Compras / Ropa / Hogar
  { description: 'Compra en MercadoLibre', merchant: 'MercadoLibre', kind: 'expense', expected: 'Compras' },
  { description: 'Ropa Zara', merchant: 'Zara', kind: 'expense', expected: 'Ropa' },
  { description: 'Sodimac Homecenter', merchant: 'Homecenter', kind: 'expense', expected: 'Hogar' },

  // Gimnasio / Cine / Educación / Viajes
  { description: 'Mensualidad Smart Fit', merchant: 'Smart Fit', kind: 'expense', expected: 'Gimnasio' },
  { description: 'Entrada Cine Colombia', merchant: 'Cine Colombia', kind: 'expense', expected: 'Cine y cultura' },
  { description: 'Curso Platzi anual', merchant: 'Platzi', kind: 'expense', expected: 'Cursos y formación' },
  { description: 'Tiquete aéreo Avianca', merchant: 'Avianca', kind: 'expense', expected: 'Viajes' },

  // Vivienda / Impuestos / Mascotas
  { description: 'Pago arriendo apartamento', merchant: null, kind: 'expense', expected: 'Arriendo o hipoteca' },
  { description: 'Declaración renta DIAN', merchant: 'DIAN', kind: 'expense', expected: 'Impuestos' },
  { description: 'Veterinaria control gato', merchant: null, kind: 'expense', expected: 'Mascotas' },

  // Income
  { description: 'Pago de nómina mayo', merchant: null, kind: 'income', expected: 'Salario' },
  { description: 'Proyecto freelance diseño', merchant: null, kind: 'income', expected: 'Freelance' },

  // Transfer
  { description: 'Traslado a cuenta de ahorros', merchant: null, kind: 'transfer', expected: 'Transferencia entre cuentas' },
  { description: 'Pago tarjeta de crédito', merchant: null, kind: 'transfer', expected: 'Pago de tarjeta' },
]
