import 'server-only'
import { and, desc, eq, inArray, ne } from 'drizzle-orm'

import { db } from '@/lib/db/client'
import { insights } from '@/lib/db/schema'

export type InsightListItem = {
  id: string
  kind: 'anomaly' | 'trend' | 'forecast' | 'recommendation' | 'achievement'
  severity: 'info' | 'notice' | 'warning'
  title: string
  body: string
  data: Record<string, unknown> | null
  action: Record<string, unknown> | null
  status: 'unread' | 'read' | 'dismissed' | 'acted'
  periodStart: string | null
  periodEnd: string | null
  generatedBy: string | null
  createdAt: Date
}

export async function listInsightsForUser(
  userId: string,
  options: {
    kind?: InsightListItem['kind']
    includeDismissed?: boolean
    limit?: number
  } = {},
): Promise<InsightListItem[]> {
  const conditions = [eq(insights.userId, userId)]
  if (options.kind) conditions.push(eq(insights.kind, options.kind))
  if (!options.includeDismissed) {
    conditions.push(inArray(insights.status, ['unread', 'read', 'acted']))
  }

  const rows = await db
    .select({
      id: insights.id,
      kind: insights.kind,
      severity: insights.severity,
      title: insights.title,
      body: insights.body,
      data: insights.data,
      action: insights.action,
      status: insights.status,
      periodStart: insights.periodStart,
      periodEnd: insights.periodEnd,
      generatedBy: insights.generatedBy,
      createdAt: insights.createdAt,
    })
    .from(insights)
    .where(and(...conditions))
    .orderBy(desc(insights.createdAt))
    .limit(options.limit ?? 100)

  return rows.map((r) => ({
    ...r,
    data: (r.data as Record<string, unknown> | null) ?? null,
    action: (r.action as Record<string, unknown> | null) ?? null,
  }))
}

export async function listUnreadInsights(
  userId: string,
  limit = 3,
): Promise<InsightListItem[]> {
  return listInsightsForUser(userId, { limit }).then((rows) =>
    rows.filter((r) => r.status !== 'dismissed' && r.status !== 'acted').slice(0, limit),
  )
}

export async function countActiveInsights(userId: string): Promise<number> {
  const rows = await db
    .select({ id: insights.id })
    .from(insights)
    .where(
      and(
        eq(insights.userId, userId),
        ne(insights.status, 'dismissed'),
        ne(insights.status, 'acted'),
      ),
    )
  return rows.length
}
