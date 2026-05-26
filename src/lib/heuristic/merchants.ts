/**
 * Seed estático de patrones merchant → categoría sistema. Funciona como
 * fallback de categorización SIN LLM cuando:
 *  - El kNN sobre embeddings no devuelve vecinos suficientemente confiables.
 *  - No hay OPENAI_API_KEY (modo heurístico puro).
 *
 * Los patrones se aplican sobre `description + ' ' + merchant`. Foco
 * LATAM-Andina (CO/MX/BR) con extensiones a marcas globales.
 *
 * `category` debe coincidir con el `name` EXACTO de una categoría sembrada en
 * `scripts/seed-categories.ts`. Si no existe, el lookup en categorize.ts la
 * omite (sin error).
 */

export type MerchantRule = {
  pattern: RegExp
  category: string
  kind: 'income' | 'expense'
}

export const MERCHANT_RULES: MerchantRule[] = [
  // ----- Transporte -----
  { pattern: /\b(uber|didi|cabify|indriver|beat)\b/i, category: 'Movilidad', kind: 'expense' },
  { pattern: /\btaxi\b/i, category: 'Movilidad', kind: 'expense' },
  { pattern: /\b(transmilenio|sitp|metro\b|metrolinea|bus\sintegrado)/i, category: 'Transporte público', kind: 'expense' },
  { pattern: /\b(gasolina|combustible|terpel|texaco|esso|biomax|primax|shell|pemex)\b/i, category: 'Combustible', kind: 'expense' },
  { pattern: /\bparqueadero|parking|peaje|peajes\b/i, category: 'Parqueaderos y peajes', kind: 'expense' },
  { pattern: /\b(taller|mecanic|mantenimiento\svehic)/i, category: 'Mantenimiento vehicular', kind: 'expense' },

  // ----- Alimentación -----
  { pattern: /\b(rappi|ifood|domicilios|pedidosya|uber eats)\b/i, category: 'Domicilios', kind: 'expense' },
  { pattern: /\b(mcdonald|kfc|burger king|dominos|pizza hut|papa john|frisby|el corral|kokoriko|sushi|hamburgues)/i, category: 'Restaurantes', kind: 'expense' },
  { pattern: /\b(juan valdez|tostao|starbucks|oma)\b/i, category: 'Café', kind: 'expense' },
  { pattern: /\bcafe(teria|ría)?\b/i, category: 'Café', kind: 'expense' },
  { pattern: /\brestaurante|almuerzo|cena|comida\b/i, category: 'Restaurantes', kind: 'expense' },
  { pattern: /\b(exito|carulla|jumbo|olimpica|d1|justo|ara|surtimax|metro\sgo|colsubsidio|cafam\ssuper|alkosto|makro|pricesmart)\b/i, category: 'Mercado', kind: 'expense' },
  { pattern: /\b(walmart|soriana|chedraui|comercial mexicana|bodega aurrera|h-e-b)\b/i, category: 'Mercado', kind: 'expense' },
  { pattern: /\b(oxxo|seven|7-eleven|tiendas\sd1|farmatodo\smini)\b/i, category: 'Mercado', kind: 'expense' },

  // ----- Vivienda -----
  { pattern: /\barriendo|alquiler|renta\smensual|hipoteca\b/i, category: 'Arriendo o hipoteca', kind: 'expense' },
  { pattern: /\b(epm|codensa|enel|gas natural|acueducto|emcali|aguas|electrica|cfe|naturgy)\b/i, category: 'Servicios públicos', kind: 'expense' },
  { pattern: /\b(claro|movistar|tigo|wom|etb|telcel|att|telmex|izzi|totalplay)\b/i, category: 'Internet', kind: 'expense' },
  { pattern: /\badmin(istracion)?\sconjunto|cuota\sadmin\b/i, category: 'Administración', kind: 'expense' },

  // ----- Salud -----
  { pattern: /\b(farmacia|drogueria|cruz verde|farmatodo|farmacias\ssan\spablo|farmacias\sguadalajara|farmacias\sahorro)/i, category: 'Medicamentos', kind: 'expense' },
  { pattern: /\bmedico|consulta|clinica|hospital|ips\s/i, category: 'Médicos y especialistas', kind: 'expense' },
  { pattern: /\bseguro\sde\ssalud|eps\s|sura\seps|sanitas|colmena\ssalud\b/i, category: 'Seguros de salud', kind: 'expense' },

  // ----- Educación -----
  { pattern: /\b(udemy|coursera|platzi|domestika|skillshare|edx|datacamp)\b/i, category: 'Cursos y formación', kind: 'expense' },
  { pattern: /\b(colegio|universidad|matricula|pension\sescolar)\b/i, category: 'Cursos y formación', kind: 'expense' },
  { pattern: /\b(libreria|libro|kindle\s|amazon\.kindle)/i, category: 'Libros', kind: 'expense' },

  // ----- Entretenimiento / suscripciones -----
  { pattern: /\b(netflix|hbo|disney|amazon prime|paramount|crunchyroll|apple tv)\b/i, category: 'Streaming', kind: 'expense' },
  { pattern: /\b(spotify|apple\smusic|youtube\smusic|tidal|deezer)\b/i, category: 'Streaming', kind: 'expense' },
  { pattern: /\b(cinemark|cinepolis|royal\sfilms|procinal)\b/i, category: 'Cine y cultura', kind: 'expense' },
  { pattern: /\bcine\b/i, category: 'Cine y cultura', kind: 'expense' },
  { pattern: /\bbar\b|cerveceria|cocktail|vino|wine/i, category: 'Salidas', kind: 'expense' },
  { pattern: /\b(ticketmaster|primera fila|boleter|concierto|teatro|estadio)/i, category: 'Conciertos y eventos', kind: 'expense' },
  { pattern: /\b(steam|playstation|nintendo|xbox|epic\sgames)\b/i, category: 'Entretenimiento', kind: 'expense' },

  // ----- Compras -----
  { pattern: /\b(zara|h&m|forever 21|adidas|nike|puma|gef|arturo calle|americanino|chevignon)\b/i, category: 'Ropa', kind: 'expense' },
  { pattern: /\bamazon|mercadolibre|shopee|aliexpress|temu|falabella|linio\b/i, category: 'Compras', kind: 'expense' },
  { pattern: /\b(ikea|homecenter|easy|sodimac|home depot|liverpool)\b/i, category: 'Hogar', kind: 'expense' },
  { pattern: /\b(samsung|apple|huawei|xiaomi|best buy|liverpool\selectro)/i, category: 'Electrónica', kind: 'expense' },

  // ----- Cuidado personal -----
  { pattern: /\b(peluqueria|barberia|salon\sbelleza|spa\s|estetica)/i, category: 'Belleza', kind: 'expense' },
  { pattern: /\b(smartfit|bodytech|gimnasio|gym|crossfit|fitness)\b/i, category: 'Gimnasio', kind: 'expense' },

  // ----- Servicios / tecnología -----
  { pattern: /\b(adobe|notion|figma|github|chatgpt|openai|cursor\.com|vercel\.com|linear\.app)\b/i, category: 'Suscripciones', kind: 'expense' },
  { pattern: /\btelefonia|plan\spostpago|celular\sclaro\b/i, category: 'Telefonía', kind: 'expense' },
  { pattern: /\bseguro\s(auto|hogar|vida|todo riesgo)/i, category: 'Seguros', kind: 'expense' },

  // ----- Mascotas -----
  { pattern: /\b(petsmart|veterinari|veterinario|petco|petys|kanu)/i, category: 'Mascotas', kind: 'expense' },

  // ----- Viajes -----
  { pattern: /\b(avianca|latam|viva\sair|wingo|aeromexico|booking|airbnb|expedia|despegar|tripadvisor)\b/i, category: 'Viajes', kind: 'expense' },

  // ----- Donaciones -----
  { pattern: /\b(donacion|aporte|cruz roja|techo|fundaci)/i, category: 'Donaciones', kind: 'expense' },

  // ----- Impuestos / comisiones -----
  { pattern: /\bimpuesto|dian\b|sat\b/i, category: 'Impuestos', kind: 'expense' },
  { pattern: /\bcomision|cuota\smanejo|gravamen|4x1000\b/i, category: 'Otros gastos', kind: 'expense' },

  // ----- Ingresos -----
  { pattern: /\b(nomina|salario|sueldo|pago\semp)/i, category: 'Salario', kind: 'income' },
  { pattern: /\bfreelance|honorarios|factura\semitida\b/i, category: 'Freelance', kind: 'income' },
  { pattern: /\bdividendos?|rendimientos?\b/i, category: 'Inversiones', kind: 'income' },
  { pattern: /\bdevolucion|reintegro|reembolso\b/i, category: 'Reembolsos', kind: 'income' },
  { pattern: /\bregalo\b/i, category: 'Regalos', kind: 'income' },
]

/**
 * Encuentra la mejor regla heurística que matchee el texto. Devuelve la
 * primera coincidencia — los patrones más específicos van arriba.
 */
export function findMerchantRule(
  text: string,
  kind: 'income' | 'expense' | 'transfer',
): MerchantRule | null {
  if (kind === 'transfer') return null
  for (const rule of MERCHANT_RULES) {
    if (rule.kind !== kind) continue
    if (rule.pattern.test(text)) return rule
  }
  return null
}
