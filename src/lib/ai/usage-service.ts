import { createAdminClient } from '@/lib/supabase/server'
import type { AIUsageAlertSettings } from '@/types/supabase'

const DEFAULT_CHANNELS = ['dashboard']
const ALLOWED_CHANNELS = ['dashboard', 'email', 'push'] as const
const DEFAULT_THRESHOLD = 50

type AllowedChannel = typeof ALLOWED_CHANNELS[number]

interface PeriodRange {
  start: Date
  end: Date
  label: string
}

export interface FeatureUsageSummary {
  feature: string
  callCount: number
  costUsd: number
  lastUsedAt?: string
}

export interface UserUsageSummary {
  period: {
    label: string
    start: string
    end: string
  }
  totals: {
    callCount: number
    costUsd: number
    inputTokens: number
    outputTokens: number
  }
  features: FeatureUsageSummary[]
  recentEvents: Array<{
    feature: string
    costUsd: number
    createdAt: string
  }>
  alertSettings: {
    thresholdUsd: number
    channels: AllowedChannel[]
    lastTriggeredAt?: string | null
  }
  alertStatus: {
    exceeded: boolean
    monthlyCostUsd: number
  }
}

export interface AdminUsageOverview {
  period: {
    label: string
    start: string
    end: string
  }
  totals: {
    callCount: number
    costUsd: number
    inputTokens: number
    outputTokens: number
    activeUsers: number
  }
  features: FeatureUsageSummary[]
  topUsers: Array<{
    userId: string
    name: string | null
    email: string | null
    callCount: number
    costUsd: number
  }>
  dailyTotals: Array<{
    date: string
    costUsd: number
  }>
}

let adminClient: ReturnType<typeof createAdminClient> | null = null

function getAdminClient() {
  if (!adminClient) {
    adminClient = createAdminClient()
  }
  return adminClient
}

export function getAllowedAlertChannels(): AllowedChannel[] {
  return [...ALLOWED_CHANNELS]
}

export async function getUsageSummaryForUser(userId: string): Promise<UserUsageSummary> {
  const admin = getAdminClient()
  const period = getCurrentMonthRange()

  const { data: dailyRows, error: summaryError } = await admin
    .from('ai_usage_daily_summary')
    .select('usage_date, feature, call_count, total_input_tokens, total_output_tokens, total_cost_usd')
    .eq('user_id', userId)
    .gte('usage_date', period.start.toISOString().split('T')[0])
    .lte('usage_date', period.end.toISOString().split('T')[0])

  if (summaryError) {
    throw summaryError
  }

  const featureMap = new Map<string, FeatureUsageSummary>()
  let totalCallCount = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCostUsd = 0

  for (const row of dailyRows || []) {
    const key = row.feature || 'unknown'
    const existing = featureMap.get(key) || {
      feature: key,
      callCount: 0,
      costUsd: 0,
      lastUsedAt: undefined
    }

    existing.callCount += row.call_count || 0
    existing.costUsd += row.total_cost_usd || 0
    featureMap.set(key, existing)

    totalCallCount += row.call_count || 0
    totalInputTokens += row.total_input_tokens || 0
    totalOutputTokens += row.total_output_tokens || 0
    totalCostUsd += row.total_cost_usd || 0
  }

  const { data: recentEvents } = await admin
    .from('ai_usage_events')
    .select('feature, cost_usd, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)

  recentEvents?.forEach((event) => {
    const entry = featureMap.get(event.feature) || {
      feature: event.feature,
      callCount: 0,
      costUsd: 0,
      lastUsedAt: undefined
    }
    if (!entry.lastUsedAt) {
      entry.lastUsedAt = event.created_at
    }
    featureMap.set(event.feature, entry)
  })

  const alertSettings = await loadAlertSettings(admin, userId)
  const thresholdUsd = alertSettings?.monthly_cost_threshold ?? DEFAULT_THRESHOLD
  const channels = (alertSettings?.alert_channels || DEFAULT_CHANNELS) as AllowedChannel[]

  return {
    period: {
      label: period.label,
      start: period.start.toISOString(),
      end: period.end.toISOString()
    },
    totals: {
      callCount: totalCallCount,
      costUsd: Number(totalCostUsd.toFixed(4)),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens
    },
    features: Array.from(featureMap.values()).sort((a, b) => b.costUsd - a.costUsd),
    recentEvents: (recentEvents || []).map((event) => ({
      feature: event.feature,
      costUsd: Number((event.cost_usd || 0).toFixed(4)),
      createdAt: event.created_at
    })),
    alertSettings: {
      thresholdUsd,
      channels,
      lastTriggeredAt: alertSettings?.last_triggered_at ?? null
    },
    alertStatus: {
      exceeded: totalCostUsd >= thresholdUsd,
      monthlyCostUsd: Number(totalCostUsd.toFixed(4))
    }
  }
}

export async function updateAlertSettings(
  userId: string,
  payload: { thresholdUsd?: number; channels?: string[] }
) {
  const admin = getAdminClient()
  const threshold = clampThreshold(payload.thresholdUsd)
  const normalizedChannels = normalizeChannels(payload.channels)

  const { data, error } = await admin
    .from('ai_usage_alert_settings')
    .upsert({
      user_id: userId,
      monthly_cost_threshold: threshold,
      alert_channels: normalizedChannels
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return {
    thresholdUsd: threshold,
    channels: (data.alert_channels || DEFAULT_CHANNELS) as AllowedChannel[]
  }
}

export async function getAdminUsageOverview(options?: { topUsers?: number }): Promise<AdminUsageOverview> {
  const admin = getAdminClient()
  const period = getCurrentMonthRange()
  const limitTopUsers = options?.topUsers ?? 5

  const { data: events, error } = await admin
    .from('ai_usage_events')
    .select('user_id, feature, cost_usd, input_tokens, output_tokens, created_at')
    .gte('created_at', period.start.toISOString())
    .lte('created_at', period.end.toISOString())

  if (error) {
    throw error
  }

  const featureMap = new Map<string, FeatureUsageSummary>()
  const userMap = new Map<
    string,
    {
      costUsd: number
      callCount: number
    }
  >()
  const dailyMap = new Map<string, number>()

  let totalCostUsd = 0
  let totalCallCount = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const event of events || []) {
    const featureKey = event.feature || 'unknown'
    const featureEntry = featureMap.get(featureKey) || {
      feature: featureKey,
      callCount: 0,
      costUsd: 0,
      lastUsedAt: undefined
    }
    featureEntry.callCount += 1
    featureEntry.costUsd += event.cost_usd || 0
    featureEntry.lastUsedAt = featureEntry.lastUsedAt || event.created_at
    featureMap.set(featureKey, featureEntry)

    if (event.user_id) {
      const userEntry = userMap.get(event.user_id) || { costUsd: 0, callCount: 0 }
      userEntry.costUsd += event.cost_usd || 0
      userEntry.callCount += 1
      userMap.set(event.user_id, userEntry)
    }

    const dayKey = event.created_at?.split('T')[0]
    if (dayKey) {
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + (event.cost_usd || 0))
    }

    totalCostUsd += event.cost_usd || 0
    totalCallCount += 1
    totalInputTokens += event.input_tokens || 0
    totalOutputTokens += event.output_tokens || 0
  }

  const topUserEntries = Array.from(userMap.entries())
    .sort((a, b) => b[1].costUsd - a[1].costUsd)
    .slice(0, limitTopUsers)

  const topUserIds = topUserEntries.map(([userId]) => userId)

  let userProfiles: Record<string, { name: string | null; email: string | null }> = {}
  if (topUserIds.length > 0) {
    const { data: profiles } = await admin
      .from('diet_daily_users')
      .select('id, name, email')
      .in('id', topUserIds)

    profiles?.forEach((profile) => {
      userProfiles[profile.id] = {
        name: profile.name,
        email: profile.email
      }
    })
  }

  return {
    period: {
      label: period.label,
      start: period.start.toISOString(),
      end: period.end.toISOString()
    },
    totals: {
      callCount: totalCallCount,
      costUsd: Number(totalCostUsd.toFixed(4)),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      activeUsers: userMap.size
    },
    features: Array.from(featureMap.values()).sort((a, b) => b.costUsd - a.costUsd),
    topUsers: topUserEntries.map(([userId, data]) => ({
      userId,
      name: userProfiles[userId]?.name || null,
      email: userProfiles[userId]?.email || null,
      callCount: data.callCount,
      costUsd: Number(data.costUsd.toFixed(4))
    })),
    dailyTotals: Array.from(dailyMap.entries())
      .map(([date, costUsd]) => ({
        date,
        costUsd: Number(costUsd.toFixed(4))
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }
}

async function loadAlertSettings(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<AIUsageAlertSettings | null> {
  const { data, error } = await admin
    .from('ai_usage_alert_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data as AIUsageAlertSettings | null
}

function getCurrentMonthRange(): PeriodRange {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  const formatter = new Intl.DateTimeFormat('zh-TW', { month: 'long', year: 'numeric' })
  return {
    start,
    end,
    label: `本月 (${formatter.format(now)})`
  }
}

function clampThreshold(value?: number) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_THRESHOLD
  }
  return Math.max(5, Math.min(1000, Number(value)))
}

function normalizeChannels(channels?: string[]): AllowedChannel[] {
  if (!channels || channels.length === 0) {
    return DEFAULT_CHANNELS as AllowedChannel[]
  }
  const filtered = channels.filter((channel): channel is AllowedChannel =>
    (ALLOWED_CHANNELS as readonly string[]).includes(channel)
  )
  return filtered.length > 0 ? filtered : (DEFAULT_CHANNELS as AllowedChannel[])
}
