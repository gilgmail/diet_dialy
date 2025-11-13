import { createAdminClient } from '@/lib/supabase/server'
import type { AIUsageAlertSettings } from '@/types/supabase'

const MODEL_PRICING: Record<string, { inputPer1K: number; outputPer1K: number }> = {
  'claude-3-5-sonnet-latest': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-5-sonnet-20241022': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-5-haiku-latest': { inputPer1K: 0.001, outputPer1K: 0.005 },
  'claude-3-5-haiku-20241022': { inputPer1K: 0.001, outputPer1K: 0.005 },
  'claude-3-haiku-20240307': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
  'claude-sonnet-4-20250514': { inputPer1K: 0.006, outputPer1K: 0.03 },
  'claude-sonnet-4-5-20250929': { inputPer1K: 0.008, outputPer1K: 0.04 }
}

const DEFAULT_MODEL_PRICING = { inputPer1K: 0.003, outputPer1K: 0.015 }
const DEFAULT_ALERT_CHANNELS = ['dashboard']
const DEFAULT_ALERT_THRESHOLD = 50

let adminClient: ReturnType<typeof createAdminClient> | null = null

function getAdminClient() {
  if (!adminClient) {
    adminClient = createAdminClient()
  }
  return adminClient
}

export interface RecordAIUsageParams {
  userId?: string | null
  feature: string
  model: string
  provider?: string
  operation?: string
  requestId?: string | null
  status?: 'completed' | 'failed'
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  metadata?: Record<string, unknown>
  errorMessage?: string
}

export interface RecordAIUsageResult {
  eventId?: string
  costUsd: number
  monthlyCostUsd?: number
  alertTriggered?: boolean
  alertChannels?: string[]
  thresholdUsd?: number
}

export async function recordAIUsage(params: RecordAIUsageParams): Promise<RecordAIUsageResult | null> {
  if (typeof window !== 'undefined') {
    return null
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[recordAIUsage] Missing SUPABASE_SERVICE_ROLE_KEY, skipping logging')
    return null
  }

  const admin = getAdminClient()
  const inputTokens = params.inputTokens ?? 0
  const outputTokens = params.outputTokens ?? 0
  const totalTokens = params.totalTokens ?? inputTokens + outputTokens
  const costUsd = calculateUsageCost(params.model, inputTokens, outputTokens)
  const payload = {
    user_id: params.userId ?? null,
    feature: params.feature,
    provider: params.provider ?? 'anthropic',
    model: params.model,
    operation: params.operation ?? 'messages.create',
    request_id: params.requestId ?? null,
    status: params.status ?? 'completed',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    cost_usd: costUsd,
    currency: 'USD',
    metadata: sanitizeMetadata(params.metadata),
    error_message: params.errorMessage ?? null
  }

  try {
    const { data, error } = await admin
      .from('ai_usage_events')
      .insert(payload)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[recordAIUsage] Failed to insert usage event:', error)
      return { eventId: undefined, costUsd }
    }

    let alertResult: Awaited<ReturnType<typeof evaluateCostAlerts>> | undefined
    if (params.userId) {
      alertResult = await evaluateCostAlerts(admin, params.userId)
    }

    return {
      eventId: data?.id,
      costUsd,
      monthlyCostUsd: alertResult?.monthlyCostUsd,
      alertTriggered: alertResult?.triggered,
      alertChannels: alertResult?.channels,
      thresholdUsd: alertResult?.thresholdUsd
    }
  } catch (error) {
    console.error('[recordAIUsage] Unexpected failure:', error)
    return { costUsd }
  }
}

function calculateUsageCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = model?.toLowerCase()
  const pricing = MODEL_PRICING[key] ?? DEFAULT_MODEL_PRICING
  const inputCost = ((inputTokens || 0) / 1000) * pricing.inputPer1K
  const outputCost = ((outputTokens || 0) / 1000) * pricing.outputPer1K
  return Number((inputCost + outputCost).toFixed(6))
}

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {}
  try {
    return JSON.parse(JSON.stringify(metadata))
  } catch {
    return {}
  }
}

async function evaluateCostAlerts(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const settings = await getOrCreateAlertSettings(admin, userId)
  const { start } = getCurrentMonthRange()

  const { data, error } = await admin
    .from('ai_usage_events')
    .select('cost_usd')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())

  if (error) {
    console.warn('[recordAIUsage] Failed to compute monthly cost:', error)
    return {
      monthlyCostUsd: 0,
      triggered: false,
      channels: settings.alert_channels ?? DEFAULT_ALERT_CHANNELS,
      thresholdUsd: settings.monthly_cost_threshold
    }
  }

  const monthlyCostUsd = (data || []).reduce((sum, row) => sum + (row.cost_usd ?? 0), 0)
  const thresholdUsd = settings.monthly_cost_threshold ?? DEFAULT_ALERT_THRESHOLD
  const shouldNotify = monthlyCostUsd >= thresholdUsd
  const lastTriggeredAt = settings.last_triggered_at
  const channels = settings.alert_channels?.length ? settings.alert_channels : DEFAULT_ALERT_CHANNELS

  if (shouldNotify && shouldTriggerAgain(lastTriggeredAt)) {
    const { error: updateError } = await admin
      .from('ai_usage_alert_settings')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', settings.id)

    if (updateError) {
      console.warn('[recordAIUsage] Failed to update last_triggered_at:', updateError)
    }

    console.info(
      '[recordAIUsage] Cost threshold reached, notifying user',
      JSON.stringify({ userId, monthlyCostUsd, thresholdUsd, channels })
    )

    return { monthlyCostUsd, triggered: true, channels, thresholdUsd }
  }

  return { monthlyCostUsd, triggered: false, channels, thresholdUsd }
}

async function getOrCreateAlertSettings(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<AIUsageAlertSettings> {
  const { data, error } = await admin
    .from('ai_usage_alert_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) {
    return data as AIUsageAlertSettings
  }

  if (error && error.code !== 'PGRST116') {
    console.warn('[recordAIUsage] Unable to load alert settings, using defaults:', error)
  }

  const { data: inserted, error: insertError } = await admin
    .from('ai_usage_alert_settings')
    .insert({
      user_id: userId,
      monthly_cost_threshold: DEFAULT_ALERT_THRESHOLD,
      alert_channels: DEFAULT_ALERT_CHANNELS
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    throw insertError || new Error('Failed to create alert settings')
  }

  return inserted as AIUsageAlertSettings
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  return { start }
}

function shouldTriggerAgain(lastTriggeredAt: string | null) {
  if (!lastTriggeredAt) return true
  const last = new Date(lastTriggeredAt)
  const now = new Date()
  // throttle alerts to once per day
  const diff = now.getTime() - last.getTime()
  const hours = diff / (1000 * 60 * 60)
  return hours >= 24
}
