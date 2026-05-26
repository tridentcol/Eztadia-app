/**
 * Seed de categorías sistema (user_id = null).
 *
 * Idempotente: si una categoría con el mismo (name, kind, user_id=null) ya existe,
 * se omite. Las subcategorías se asocian a su padre por nombre.
 *
 * Uso: pnpm tsx --env-file=.env.local scripts/seed-categories.ts
 */

import 'dotenv/config'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { categories, type NewCategory } from '../src/lib/db/schema'

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error('Falta DIRECT_URL o DATABASE_URL en el entorno.')
  process.exit(1)
}

const sqlClient = postgres(url, { prepare: false, max: 1 })
const db = drizzle(sqlClient, { casing: 'snake_case' })

// Paleta muted curada (8 swatches). Sin saturación alta.
const palette = {
  slate: '#6B7280',
  stone: '#78716C',
  olive: '#93876B',
  sage: '#7FB89F',
  rose: '#D4938A',
  mauve: '#9D8AAB',
  sand: '#C2A776',
  steel: '#6B8294',
} as const

type SeedCategory = {
  name: string
  kind: 'income' | 'expense' | 'transfer'
  icon: string
  color: string
  children?: { name: string; icon: string }[]
}

const seed: SeedCategory[] = [
  // ===== Ingresos =====
  { name: 'Salario', kind: 'income', icon: 'briefcase', color: palette.sage },
  { name: 'Freelance', kind: 'income', icon: 'pen-tool', color: palette.sage },
  { name: 'Inversiones', kind: 'income', icon: 'trending-up', color: palette.sage },
  { name: 'Reembolsos', kind: 'income', icon: 'rotate-ccw', color: palette.sage },
  { name: 'Regalos', kind: 'income', icon: 'gift', color: palette.sage },
  { name: 'Otros ingresos', kind: 'income', icon: 'plus-circle', color: palette.sage },

  // ===== Gastos =====
  {
    name: 'Vivienda',
    kind: 'expense',
    icon: 'home',
    color: palette.slate,
    children: [
      { name: 'Arriendo o hipoteca', icon: 'key' },
      { name: 'Servicios públicos', icon: 'plug' },
      { name: 'Internet', icon: 'wifi' },
      { name: 'Administración', icon: 'building' },
      { name: 'Mantenimiento del hogar', icon: 'wrench' },
    ],
  },
  {
    name: 'Alimentación',
    kind: 'expense',
    icon: 'utensils',
    color: palette.olive,
    children: [
      { name: 'Mercado', icon: 'shopping-cart' },
      { name: 'Restaurantes', icon: 'utensils-crossed' },
      { name: 'Café', icon: 'coffee' },
      { name: 'Domicilios', icon: 'bike' },
    ],
  },
  {
    name: 'Transporte',
    kind: 'expense',
    icon: 'car',
    color: palette.steel,
    children: [
      { name: 'Combustible', icon: 'fuel' },
      { name: 'Transporte público', icon: 'bus' },
      { name: 'Movilidad', icon: 'car-front' },
      { name: 'Mantenimiento vehicular', icon: 'wrench' },
      { name: 'Parqueaderos y peajes', icon: 'parking' },
    ],
  },
  {
    name: 'Salud',
    kind: 'expense',
    icon: 'heart-pulse',
    color: palette.rose,
    children: [
      { name: 'Médicos y especialistas', icon: 'stethoscope' },
      { name: 'Medicamentos', icon: 'pill' },
      { name: 'Seguros de salud', icon: 'shield-plus' },
    ],
  },
  {
    name: 'Educación',
    kind: 'expense',
    icon: 'book-open',
    color: palette.steel,
    children: [
      { name: 'Cursos y formación', icon: 'graduation-cap' },
      { name: 'Libros', icon: 'book' },
      { name: 'Suscripciones educativas', icon: 'newspaper' },
    ],
  },
  {
    name: 'Entretenimiento',
    kind: 'expense',
    icon: 'sparkles',
    color: palette.mauve,
    children: [
      { name: 'Streaming', icon: 'monitor-play' },
      { name: 'Salidas', icon: 'glass-water' },
      { name: 'Cine y cultura', icon: 'film' },
      { name: 'Conciertos y eventos', icon: 'ticket' },
    ],
  },
  {
    name: 'Compras',
    kind: 'expense',
    icon: 'shopping-bag',
    color: palette.sand,
    children: [
      { name: 'Ropa', icon: 'shirt' },
      { name: 'Hogar', icon: 'lamp' },
      { name: 'Electrónica', icon: 'cpu' },
    ],
  },
  {
    name: 'Cuidado personal',
    kind: 'expense',
    icon: 'scissors',
    color: palette.stone,
    children: [
      { name: 'Belleza', icon: 'sparkle' },
      { name: 'Gimnasio', icon: 'dumbbell' },
    ],
  },
  {
    name: 'Servicios',
    kind: 'expense',
    icon: 'circle-dot',
    color: palette.slate,
    children: [
      { name: 'Telefonía', icon: 'phone' },
      { name: 'Suscripciones', icon: 'repeat' },
      { name: 'Seguros', icon: 'shield' },
    ],
  },
  { name: 'Hijos', kind: 'expense', icon: 'baby', color: palette.stone },
  { name: 'Mascotas', kind: 'expense', icon: 'paw-print', color: palette.stone },
  { name: 'Viajes', kind: 'expense', icon: 'plane', color: palette.mauve },
  { name: 'Donaciones', kind: 'expense', icon: 'hand-heart', color: palette.sage },
  { name: 'Impuestos', kind: 'expense', icon: 'landmark', color: palette.slate },
  { name: 'Otros gastos', kind: 'expense', icon: 'circle', color: palette.stone },

  // ===== Transferencias =====
  { name: 'Transferencia entre cuentas', kind: 'transfer', icon: 'arrow-right-left', color: palette.slate },
  { name: 'Pago de tarjeta', kind: 'transfer', icon: 'credit-card', color: palette.slate },
]

async function upsertCategory(
  category: NewCategory & { name: string; kind: 'income' | 'expense' | 'transfer' },
): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        isNull(categories.userId),
        eq(categories.name, category.name),
        eq(categories.kind, category.kind),
        category.parentId
          ? eq(categories.parentId, category.parentId)
          : isNull(categories.parentId),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0].id

  const [inserted] = await db.insert(categories).values(category).returning({ id: categories.id })
  if (!inserted) throw new Error(`No se pudo insertar categoría: ${category.name}`)
  return inserted.id
}

async function main() {
  console.log('Sembrando categorías sistema...')

  let createdParents = 0
  let createdChildren = 0
  let order = 0

  for (const parent of seed) {
    const parentId = await upsertCategory({
      name: parent.name,
      kind: parent.kind,
      icon: parent.icon,
      color: parent.color,
      sortOrder: order++,
    })
    createdParents++

    if (parent.children) {
      let childOrder = 0
      for (const child of parent.children) {
        await upsertCategory({
          name: child.name,
          kind: parent.kind,
          icon: child.icon,
          color: parent.color,
          parentId,
          sortOrder: childOrder++,
        })
        createdChildren++
      }
    }
  }

  const total = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories)
    .where(isNull(categories.userId))

  console.log(`Padres procesados: ${createdParents}`)
  console.log(`Subcategorías procesadas: ${createdChildren}`)
  console.log(`Total de categorías sistema en DB: ${total[0]?.count ?? 0}`)
  console.log('Hecho.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await sqlClient.end()
  })
