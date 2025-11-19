// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

type Operation = 'create' | 'update' | 'pause' | 'resume'

type ReminderScheduleType = 'cron' | 'every_n_days' | 'relative_cycle'

type ReminderPreferences = {
  title?: string
  schedule_type?: ReminderScheduleType
  interval_days?: number | null
  window_start?: string | null
  window_end?: string | null
  timezone?: string
  lead_time_minutes?: number | null
  snooze_minutes?: number | null
  auto_dismiss_rule?: 'existing_entry' | 'manual_only' | 'never'
  metadata?: Record<string, any>
  status?: 'active' | 'paused' | 'archived'
  ios_visible?: boolean
}

type RegimenRecord = {
  id: string
  user_id: string
  medication_id: string | null
  custom_name: string | null
  route: 'oral' | 'injection' | 'other'
  frequency_type: 'every_n_days' | 'prn' | 'cron'
  interval_days: number | null
  cycle_anchor_date: string
  symptom_trigger_allowed: boolean
  default_dose: string | null
  status: 'active' | 'paused' | 'ended'
  medication_catalog?: {
    id: string
    name: string | null
    route: string | null
    default_interval_days: number | null
    default_dosage: string | null
    is_injection: boolean | null
  } | null
  user?: {
    id: string
    timezone: string | null
    preferences: Record<string, any> | null
    language: string | null
  } | null
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined')
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

const DEFAULT_REMINDER_WINDOW_START = '09:00:00'
const DEFAULT_REMINDER_WINDOW_END = '21:00:00'

type SyncResult = {
  reminder_id: string
  reminder_status: string
  cycle_action: 'created' | 'updated' | 'skipped' | 'disabled'
  cycle_id: string | null
  expected_next_date: string | null
}

function addDays(dateInput: string, days: number): string {
  const baseDate = new Date(`${dateInput}T00:00:00.000Z`)
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error(`INVALID_DATE_INPUT: ${dateInput}`)
  }
  const result = new Date(baseDate)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue
    cleaned[key] = value
  }
  return cleaned
}

async function fetchRegimen(regimenId: string): Promise<RegimenRecord | null> {
  const { data, error } = await supabase
    .from('medication_regimens')
    .select(`
      id,
      user_id,
      medication_id,
      custom_name,
      route,
      frequency_type,
      interval_days,
      cycle_anchor_date,
      symptom_trigger_allowed,
      default_dose,
      status,
      medication_catalog:medication_catalog (
        id,
        name,
        route,
        default_interval_days,
        default_dosage,
        is_injection
      ),
      user:diet_daily_users!medication_regimens_user_id_fkey (
        id,
        timezone,
        preferences,
        language
      )
    `)
    .eq('id', regimenId)
    .maybeSingle()

  if (error) {
    console.error('[medication-regimen-sync] Failed to fetch regimen', error)
    throw new Error('REGIMEN_FETCH_FAILED')
  }

  return data as RegimenRecord | null
}

async function fetchExistingReminder(regimenId: string) {
  const { data, error } = await supabase
    .from('user_reminders')
    .select('*')
    .eq('target_type', 'medication_regimen')
    .eq('target_id', regimenId)
    .eq('reminder_category', 'medication')
    .limit(1)

  if (error) {
    console.error('[medication-regimen-sync] Failed to load reminder', error)
    throw new Error('REMINDER_FETCH_FAILED')
  }

  return data?.[0] ?? null
}

async function nextCycleNumber(regimenId: string) {
  const { data, error } = await supabase
    .from('medication_cycles')
    .select('cycle_number')
    .eq('regimen_id', regimenId)
    .order('cycle_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[medication-regimen-sync] Failed to load cycle number', error)
    throw new Error('CYCLE_FETCH_FAILED')
  }

  if (!data?.length) return 1
  return (data[0].cycle_number as number) + 1
}

async function upsertCycle(regimen: RegimenRecord) {
  const isCycleBased =
    regimen.route === 'injection' &&
    regimen.frequency_type !== 'prn' &&
    (regimen.interval_days ?? 0) > 0

  if (!isCycleBased) {
    // Disable scheduled cycles if regimen is no longer cycle-based
    await supabase
      .from('medication_cycles')
      .update({
        status: 'skipped',
        updated_at: new Date().toISOString()
      })
      .eq('regimen_id', regimen.id)
      .eq('status', 'scheduled')
    return {
      action: 'disabled' as const,
      cycleId: null,
      expectedNext: null
    }
  }

  if (!regimen.interval_days || regimen.interval_days <= 0) {
    throw new Error('INVALID_INTERVAL_DAYS')
  }

  if (!regimen.cycle_anchor_date) {
    throw new Error('MISSING_CYCLE_ANCHOR')
  }

  const expectedNextDate = addDays(regimen.cycle_anchor_date, regimen.interval_days)
  const { data: scheduledCycles, error } = await supabase
    .from('medication_cycles')
    .select('id, cycle_number, cycle_start_date, expected_next_date')
    .eq('regimen_id', regimen.id)
    .eq('status', 'scheduled')
    .order('cycle_number', { ascending: true })
    .limit(1)

  if (error) {
    console.error('[medication-regimen-sync] Failed to query scheduled cycles', error)
    throw new Error('CYCLE_FETCH_FAILED')
  }

  if (!scheduledCycles?.length) {
    const cycleNumber = await nextCycleNumber(regimen.id)
    const { data: inserted, error: insertError } = await supabase
      .from('medication_cycles')
      .insert({
        regimen_id: regimen.id,
        cycle_number: cycleNumber,
        cycle_start_date: regimen.cycle_anchor_date,
        expected_next_date: expectedNextDate,
        status: 'scheduled'
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[medication-regimen-sync] Failed to insert cycle', insertError)
      throw new Error('CYCLE_INSERT_FAILED')
    }

    return {
      action: 'created' as const,
      cycleId: inserted.id as string,
      expectedNext: expectedNextDate
    }
  }

  const currentCycle = scheduledCycles[0]
  const needsUpdate =
    currentCycle.cycle_start_date !== regimen.cycle_anchor_date ||
    currentCycle.expected_next_date !== expectedNextDate

  if (!needsUpdate) {
    return {
      action: 'skipped' as const,
      cycleId: currentCycle.id as string,
      expectedNext: currentCycle.expected_next_date as string
    }
  }

  const { error: updateError } = await supabase
    .from('medication_cycles')
    .update({
      cycle_start_date: regimen.cycle_anchor_date,
      expected_next_date: expectedNextDate,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentCycle.id)

  if (updateError) {
    console.error('[medication-regimen-sync] Failed to update cycle', updateError)
    throw new Error('CYCLE_UPDATE_FAILED')
  }

  return {
    action: 'updated' as const,
    cycleId: currentCycle.id as string,
    expectedNext: expectedNextDate
  }
}

function resolveScheduleType(
  regimen: RegimenRecord,
  prefs: ReminderPreferences
): ReminderScheduleType {
  if (prefs.schedule_type) return prefs.schedule_type

  if (regimen.route === 'injection' && regimen.frequency_type !== 'prn') {
    return 'relative_cycle'
  }

  if (regimen.frequency_type === 'cron') {
    return 'cron'
  }

  return 'every_n_days'
}

function determineIntervalDays(
  scheduleType: ReminderScheduleType,
  regimen: RegimenRecord,
  prefs: ReminderPreferences
) {
  if (scheduleType === 'relative_cycle') {
    return null
  }

  if (scheduleType === 'cron') {
    return prefs.interval_days ?? null
  }

  const effectiveInterval = prefs.interval_days ?? regimen.interval_days ?? 1
  return effectiveInterval > 0 ? effectiveInterval : 1
}

function buildReminderMetadata(
  regimen: RegimenRecord,
  scheduleType: ReminderScheduleType,
  prefs: ReminderPreferences
) {
  const metadata: Record<string, any> = {
    medication_id: regimen.medication_id,
    route: regimen.route,
    frequency_type: regimen.frequency_type,
    default_dose: regimen.default_dose,
    cycle_anchor_date: regimen.cycle_anchor_date
  }

  if (scheduleType === 'relative_cycle') {
    metadata.cycle_offset_days = prefs.metadata?.cycle_offset_days ?? 0
  }

  if (regimen.frequency_type === 'prn') {
    metadata.prn_only = true
  }

  if (prefs.metadata) {
    for (const [key, value] of Object.entries(prefs.metadata)) {
      if (value === undefined) continue
      metadata[key] = value
    }
  }

  return sanitizeMetadata(metadata)
}

function deriveReminderTitle(regimen: RegimenRecord, prefs: ReminderPreferences) {
  if (prefs.title) return prefs.title
  if (regimen.custom_name) return regimen.custom_name
  if (regimen.medication_catalog?.name) return regimen.medication_catalog.name
  return 'Medication Reminder'
}

async function upsertReminder(
  regimen: RegimenRecord,
  prefs: ReminderPreferences,
  operation: Operation
) {
  const existing = await fetchExistingReminder(regimen.id)
  const scheduleType = resolveScheduleType(regimen, prefs)
  const mergedPrefs = { ...prefs }
  const intervalDays = determineIntervalDays(scheduleType, regimen, mergedPrefs)
  const timezone =
    mergedPrefs.timezone ?? regimen.user?.timezone ?? 'UTC'
  const windowStart = mergedPrefs.window_start ?? DEFAULT_REMINDER_WINDOW_START
  const windowEnd = mergedPrefs.window_end ?? DEFAULT_REMINDER_WINDOW_END

  let computedStatus = mergedPrefs.status ?? existing?.status ?? 'active'
  if (operation === 'pause') computedStatus = 'paused'
  if (operation === 'resume') computedStatus = 'active'
  if (regimen.frequency_type === 'prn') computedStatus = 'paused'
  if (regimen.status !== 'active') computedStatus = 'paused'

  const payload = {
    user_id: regimen.user_id,
    target_type: 'medication_regimen',
    target_id: regimen.id,
    reminder_category: 'medication' as const,
    title: deriveReminderTitle(regimen, mergedPrefs),
    schedule_type: scheduleType,
    interval_days: intervalDays,
    window_start: scheduleType === 'cron' ? null : windowStart,
    window_end: scheduleType === 'cron' ? null : windowEnd,
    timezone,
    lead_time_minutes:
      mergedPrefs.lead_time_minutes ?? (scheduleType === 'relative_cycle' ? 720 : 0),
    snooze_minutes: mergedPrefs.snooze_minutes ?? 10,
    auto_dismiss_rule: mergedPrefs.auto_dismiss_rule ?? 'manual_only',
    metadata: buildReminderMetadata(regimen, scheduleType, mergedPrefs),
    status: computedStatus,
    ios_visible: mergedPrefs.ios_visible ?? true,
    updated_at: new Date().toISOString()
  }

  if (existing) {
    const { data, error } = await supabase
      .from('user_reminders')
      .update(payload)
      .eq('id', existing.id)
      .select('id, status')
      .single()

    if (error) {
      console.error('[medication-regimen-sync] Failed to update reminder', error)
      throw new Error('REMINDER_UPDATE_FAILED')
    }

    return { reminderId: data.id as string, status: data.status as string }
  }

  const { data, error } = await supabase
    .from('user_reminders')
    .insert({
      ...payload,
      created_at: new Date().toISOString()
    })
    .select('id, status')
    .single()

  if (error) {
    console.error('[medication-regimen-sync] Failed to create reminder', error)
    throw new Error('REMINDER_CREATE_FAILED')
  }

  return { reminderId: data.id as string, status: data.status as string }
}

async function syncRegimen(
  regimen: RegimenRecord,
  prefs: ReminderPreferences,
  operation: Operation
): Promise<SyncResult> {
  const reminder = await upsertReminder(regimen, prefs, operation)
  const cycleResult = await upsertCycle(regimen)

  return {
    reminder_id: reminder.reminderId,
    reminder_status: reminder.status,
    cycle_action: cycleResult.action,
    cycle_id: cycleResult.cycleId,
    expected_next_date: cycleResult.expectedNext
  }
}

function badRequest(message: string, code?: string) {
  return new Response(
    JSON.stringify({ success: false, error: message, code }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

function serverError(message: string, code?: string) {
  return new Response(
    JSON.stringify({ success: false, error: message, code }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (_error) {
    return badRequest('INVALID_JSON_BODY')
  }

  const regimenId = body?.regimen_id
  if (!regimenId || typeof regimenId !== 'string') {
    return badRequest('regimen_id is required', 'MISSING_REGIMEN_ID')
  }

  const normalizedOperation = (
    typeof body?.operation === 'string' ? body.operation : 'create'
  )
    .toLowerCase()
    .trim() as Operation

  if (!['create', 'update', 'pause', 'resume'].includes(normalizedOperation)) {
    return badRequest('Invalid operation', 'INVALID_OPERATION')
  }

  let regimen: RegimenRecord | null
  try {
    regimen = await fetchRegimen(regimenId)
  } catch (error) {
    console.error('[medication-regimen-sync] fetch error', error)
    return serverError('Failed to load regimen', (error as Error).message)
  }

  if (!regimen) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Regimen not found',
        code: 'REGIMEN_NOT_FOUND'
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const reminderPrefs: ReminderPreferences = body?.reminder_preferences ?? {}

  try {
    const result = await syncRegimen(regimen, reminderPrefs, normalizedOperation)
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[medication-regimen-sync] sync failed', error)
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

    if (message === 'INVALID_INTERVAL_DAYS') {
      return badRequest('Interval days required for this regimen', message)
    }
    if (message === 'MISSING_CYCLE_ANCHOR') {
      return badRequest('Cycle anchor date missing', message)
    }

    return serverError('Failed to sync regimen', message)
  }
})
