import { NextRequest, NextResponse } from 'next/server'
import type { PostgrestError } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/server'
import {
  createUnauthorizedResponse,
  getAuthenticatedUser
} from '@/lib/supabase/server-auth'
import type { Database, Json } from '@/types/supabase'

type SupabaseClient = ReturnType<typeof createAdminClient>

type MedicationRegimenRow =
  Database['public']['Tables']['medication_regimens']['Row']
type MedicationRegimenInsert =
  Database['public']['Tables']['medication_regimens']['Insert']
type MedicationRegimenUpdate =
  Database['public']['Tables']['medication_regimens']['Update']
type MedicationCatalogRow =
  Database['public']['Tables']['medication_catalog']['Row']

type ReminderScheduleType = 'cron' | 'every_n_days' | 'relative_cycle'
type ReminderStatus = 'active' | 'paused' | 'archived'
type ReminderAutoDismiss = 'existing_entry' | 'manual_only' | 'never'
type SyncOperation = 'create' | 'update' | 'pause' | 'resume'

type ReminderPreferencesInput = Partial<{
  title: string
  schedule_type: ReminderScheduleType
  interval_days: number | null
  window_start: string | null
  window_end: string | null
  timezone: string
  lead_time_minutes: number | null
  snooze_minutes: number | null
  auto_dismiss_rule: ReminderAutoDismiss
  metadata: Record<string, Json>
  status: ReminderStatus
  ios_visible: boolean
}>

type RegimenWithCatalog = MedicationRegimenRow & {
  medication_catalog: Pick<
    MedicationCatalogRow,
    'id' | 'name' | 'route' | 'default_dosage' | 'default_interval_days' | 'is_injection'
  > | null
}

type MedicationCatalogLookup = Pick<
  MedicationCatalogRow,
  'id' | 'route' | 'default_interval_days' | 'default_dosage' | 'is_injection'
>

const ROUTE_OPTIONS = new Set<NonNullable<MedicationRegimenRow['route']>>([
  'oral',
  'injection',
  'other'
])
const FREQUENCY_OPTIONS = new Set<MedicationRegimenRow['frequency_type']>([
  'every_n_days',
  'prn',
  'cron'
])
const STATUS_OPTIONS = new Set<MedicationRegimenRow['status']>([
  'active',
  'paused',
  'ended'
])
const REMINDER_STATUS_OPTIONS = new Set<ReminderStatus>([
  'active',
  'paused',
  'archived'
])
const REMINDER_SCHEDULE_OPTIONS = new Set<ReminderScheduleType>([
  'cron',
  'every_n_days',
  'relative_cycle'
])
const AUTO_DISMISS_OPTIONS = new Set<ReminderAutoDismiss>([
  'existing_entry',
  'manual_only',
  'never'
])

const REGIMEN_SELECT =
  `
  *,
  medication_catalog:medication_catalog (
    id,
    name,
    route,
    default_dosage,
    default_interval_days,
    is_injection
  )
`.trim()

const DEFAULT_LIMIT = 50

export async function GET(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedUser(request)
  if (!authenticatedUser) {
    return createUnauthorizedResponse('請先登入以讀取療程資料')
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const regimenId = searchParams.get('id')
  const statusParam = searchParams.get('status')
  const limit =
    parsePositiveInteger(searchParams.get('limit')) ?? DEFAULT_LIMIT

  try {
    if (regimenId) {
      const { data, error } = await supabase
        .from('medication_regimens')
        .select(REGIMEN_SELECT)
        .eq('user_id', authenticatedUser.id)
        .eq('id', regimenId)
        .maybeSingle()

      if (error) {
        return databaseErrorResponse(error, '讀取療程失敗')
      }

      if (!data) {
        return notFoundResponse('找不到指定的療程')
      }

      const regimen = toRegimenWithCatalog(data)
      return NextResponse.json({
        success: true,
        data: formatRegimen(regimen)
      })
    }

    let query = supabase
      .from('medication_regimens')
      .select(REGIMEN_SELECT)
      .eq('user_id', authenticatedUser.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((value) => value.trim())
        .filter((value) => STATUS_OPTIONS.has(value as MedicationRegimenRow['status']))

      if (statuses.length > 0) {
        query = query.in('status', statuses)
      }
    } else {
      // 預設僅列出 active / paused
      query = query.in('status', ['active', 'paused'])
    }

    const { data, error } = await query

    if (error) {
      return databaseErrorResponse(error, '讀取療程清單失敗')
    }

    const regimens = (data ?? []).map((row: unknown) =>
      formatRegimen(toRegimenWithCatalog(row))
    )

    return NextResponse.json({
      success: true,
      data: regimens,
      meta: {
        count: regimens.length
      }
    })
  } catch (error) {
    console.error('[medication-regimens] GET failed', error)
    return serverErrorResponse('無法讀取療程資料')
  }
}

export async function POST(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedUser(request)
  if (!authenticatedUser) {
    return createUnauthorizedResponse('請先登入以建立療程')
  }

  let body: any
  try {
    body = await request.json()
  } catch (_error) {
    return badRequestResponse('請提供有效的 JSON 請求內容', 'INVALID_JSON')
  }

  const validation = validateCreatePayload(body)
  if (!validation.valid) {
    return badRequestResponse(
      validation.message ?? '請提供有效的請求內容',
      validation.code
    )
  }

  const reminderPrefs = sanitizeReminderPreferences(body?.reminder_preferences)
  const supabase = createAdminClient()

  try {
    const medicationDefaults = await fetchMedicationDefaults(
      supabase,
      body?.medication_id
    )

    if (body?.medication_id && !medicationDefaults) {
      return badRequestResponse('指定的藥品不存在', 'MEDICATION_NOT_FOUND')
    }

    const insertPayload = buildInsertPayload({
      body,
      userId: authenticatedUser.id,
      medicationDefaults
    })

    const { data, error } = await supabase
      .from('medication_regimens')
      .insert(insertPayload)
      .select(REGIMEN_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        return badRequestResponse('療程已存在或與現有設定衝突', 'REGIMEN_DUPLICATED')
      }
      return databaseErrorResponse(error, '建立療程失敗')
    }

    const insertedRegimen = toRegimenRow(data)
    let syncResult: unknown = null
    try {
      syncResult = await invokeRegimenSync(
        supabase,
        insertedRegimen.id,
        'create',
        reminderPrefs
      )
    } catch (syncError) {
      console.error('[medication-regimens] sync after create failed', syncError)
      // 嘗試回滾插入，避免提醒狀態未同步
      await supabase
        .from('medication_regimens')
        .delete()
        .eq('id', insertedRegimen.id)
      return serverErrorResponse(
        '療程已建立但同步提醒/週期時發生錯誤，請稍後再試',
        (syncError as Error).message
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          regimen: formatRegimen(toRegimenWithCatalog(data)),
          sync: syncResult
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[medication-regimens] POST failed', error)
    return serverErrorResponse('建立療程失敗，請稍後再試')
  }
}

export async function PATCH(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedUser(request)
  if (!authenticatedUser) {
    return createUnauthorizedResponse('請先登入以更新療程')
  }

  let body: any
  try {
    body = await request.json()
  } catch (_error) {
    return badRequestResponse('請提供有效的 JSON 請求內容', 'INVALID_JSON')
  }

  const regimenId = typeof body?.regimen_id === 'string' ? body.regimen_id : null
  if (!regimenId) {
    return badRequestResponse('regimen_id 為必填欄位', 'MISSING_REGIMEN_ID')
  }

  const reminderPrefs = sanitizeReminderPreferences(body?.reminder_preferences)
  const { update, error: validationError } = buildUpdatePayload(body)
  if (validationError) {
    return badRequestResponse(validationError.message, validationError.code)
  }

  if (!update || Object.keys(update).length === 0) {
    return badRequestResponse('請提供至少一個可更新欄位', 'EMPTY_UPDATE')
  }

  const supabase = createAdminClient()

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('medication_regimens')
      .select('id, user_id')
      .eq('id', regimenId)
      .eq('user_id', authenticatedUser.id)
      .maybeSingle()

    if (fetchError) {
      return databaseErrorResponse(fetchError, '讀取療程失敗')
    }

    if (!existing) {
      return notFoundResponse('找不到要更新的療程')
    }

    const { data, error } = await supabase
      .from('medication_regimens')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      } satisfies MedicationRegimenUpdate)
      .eq('id', regimenId)
      .eq('user_id', authenticatedUser.id)
      .select(REGIMEN_SELECT)
      .single()

    if (error) {
      return databaseErrorResponse(error, '更新療程失敗')
    }

    const operation = resolveSyncOperation(update.status)

    let syncResult: unknown = null
    try {
      syncResult = await invokeRegimenSync(
        supabase,
        regimenId,
        operation,
        reminderPrefs
      )
    } catch (syncError) {
      console.error('[medication-regimens] sync after update failed', syncError)
      return serverErrorResponse(
        '療程已更新，但同步提醒/週期時發生錯誤',
        (syncError as Error).message
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        regimen: formatRegimen(toRegimenWithCatalog(data)),
        sync: syncResult
      }
    })
  } catch (error) {
    console.error('[medication-regimens] PATCH failed', error)
    return serverErrorResponse('更新療程失敗，請稍後再試')
  }
}

export async function DELETE(request: NextRequest) {
  const authenticatedUser = await getAuthenticatedUser(request)
  if (!authenticatedUser) {
    return createUnauthorizedResponse('請先登入以刪除療程')
  }

  let body: any
  try {
    body = await request.json()
  } catch (_error) {
    return badRequestResponse('請提供有效的 JSON 請求內容', 'INVALID_JSON')
  }

  const regimenId = typeof body?.regimen_id === 'string' ? body.regimen_id : null
  if (!regimenId) {
    return badRequestResponse('regimen_id 為必填欄位', 'MISSING_REGIMEN_ID')
  }

  const hardDelete = Boolean(body?.hard_delete)
  const reminderPrefs = sanitizeReminderPreferences(body?.reminder_preferences)
  const supabase = createAdminClient()

  try {
    if (hardDelete) {
      await supabase
        .from('user_reminders')
        .delete()
        .eq('user_id', authenticatedUser.id)
        .eq('target_type', 'medication_regimen')
        .eq('target_id', regimenId)

      const { data, error } = await supabase
        .from('medication_regimens')
        .delete()
        .eq('id', regimenId)
        .eq('user_id', authenticatedUser.id)
        .select('id')
        .maybeSingle()

      if (error) {
        return databaseErrorResponse(error, '刪除療程失敗')
      }

      if (!data) {
        return notFoundResponse('找不到要刪除的療程')
      }

      return NextResponse.json({
        success: true,
        data: { deleted: true, hard_delete: true }
      })
    }

    const { data, error } = await supabase
      .from('medication_regimens')
      .update({
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .eq('id', regimenId)
      .eq('user_id', authenticatedUser.id)
      .select(REGIMEN_SELECT)
      .single()

    if (error) {
      return databaseErrorResponse(error, '終止療程失敗')
    }

    let syncResult: unknown = null
    try {
      syncResult = await invokeRegimenSync(
        supabase,
        regimenId,
        'pause',
        reminderPrefs
      )
    } catch (syncError) {
      console.error('[medication-regimens] sync after soft delete failed', syncError)
      return serverErrorResponse(
        '療程已標記為結束，但同步提醒時發生錯誤',
        (syncError as Error).message
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        regimen: formatRegimen(toRegimenWithCatalog(data)),
        sync: syncResult,
        soft_deleted: true
      }
    })
  } catch (error) {
    console.error('[medication-regimens] DELETE failed', error)
    return serverErrorResponse('刪除療程失敗，請稍後再試')
  }
}

function buildInsertPayload({
  body,
  userId,
  medicationDefaults
}: {
  body: any
  userId: string
  medicationDefaults: MedicationCatalogLookup | null
}): MedicationRegimenInsert {
  const customName = sanitizeNonEmptyString(body?.custom_name)
  const defaultDose =
    sanitizeNonEmptyString(body?.default_dose) ??
    medicationDefaults?.default_dosage ??
    null
  const calculatedRoute =
    sanitizeRoute(body?.route) ??
    medicationDefaults?.route ??
    'oral'
  const resolvedFrequency = body?.frequency_type as MedicationRegimenRow['frequency_type']
  const resolvedInterval =
    resolvedFrequency === 'every_n_days'
      ? parsePositiveInteger(body?.interval_days) ??
        medicationDefaults?.default_interval_days ??
        null
      : parsePositiveInteger(body?.interval_days)

  return {
    user_id: userId,
    medication_id: typeof body?.medication_id === 'string' ? body.medication_id : null,
    custom_name: customName,
    route: calculatedRoute,
    frequency_type: resolvedFrequency,
    interval_days: resolvedInterval,
    cycle_anchor_date: body.cycle_anchor_date,
    symptom_trigger_allowed: Boolean(body?.symptom_trigger_allowed),
    default_dose: defaultDose,
    status: 'active',
    notes: sanitizeNonEmptyString(body?.notes)
  }
}

function buildUpdatePayload(body: any): {
  update: Partial<MedicationRegimenUpdate>
  error?: { message: string; code: string }
} {
  const update: Partial<MedicationRegimenUpdate> = {}

  if (typeof body?.custom_name === 'string') {
    update.custom_name = sanitizeNonEmptyString(body.custom_name)
  }
  if (typeof body?.default_dose === 'string') {
    update.default_dose = sanitizeNonEmptyString(body.default_dose)
  }
  if (typeof body?.notes === 'string') {
    update.notes = sanitizeNonEmptyString(body.notes)
  }
  if (body?.route !== undefined) {
    const route = sanitizeRoute(body.route)
    if (!route) {
      return {
        update,
        error: { message: 'route 格式不正確', code: 'INVALID_ROUTE' }
      }
    }
    update.route = route
  }
  if (body?.frequency_type !== undefined) {
    if (!FREQUENCY_OPTIONS.has(body.frequency_type)) {
      return {
        update,
        error: { message: 'frequency_type 格式不正確', code: 'INVALID_FREQUENCY' }
      }
    }
    update.frequency_type = body.frequency_type
  }
  if (body?.interval_days !== undefined) {
    const intervalDays = parsePositiveInteger(body.interval_days)
    if (intervalDays === null) {
      return {
        update,
        error: { message: 'interval_days 必須為正整數', code: 'INVALID_INTERVAL' }
      }
    }
    update.interval_days = intervalDays
  }
  if (body?.cycle_anchor_date !== undefined) {
    if (!isValidDateString(body.cycle_anchor_date)) {
      return {
        update,
        error: { message: 'cycle_anchor_date 格式不正確', code: 'INVALID_DATE' }
      }
    }
    update.cycle_anchor_date = body.cycle_anchor_date
  }
  if (body?.symptom_trigger_allowed !== undefined) {
    update.symptom_trigger_allowed = Boolean(body.symptom_trigger_allowed)
  }
  if (body?.status !== undefined) {
    if (!STATUS_OPTIONS.has(body.status)) {
      return {
        update,
        error: { message: 'status 格式不正確', code: 'INVALID_STATUS' }
      }
    }
    update.status = body.status
  }

  return { update }
}

function validateCreatePayload(body: any): {
  valid: boolean
  message?: string
  code?: string
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, message: '請提供有效的請求內容', code: 'INVALID_PAYLOAD' }
  }

  const medicationId = typeof body.medication_id === 'string' ? body.medication_id : null
  const customName = sanitizeNonEmptyString(body.custom_name)

  if (!medicationId && !customName) {
    return {
      valid: false,
      message: 'medication_id 與 custom_name 至少需要填寫一項',
      code: 'MISSING_MEDICATION_REFERENCE'
    }
  }

  if (!FREQUENCY_OPTIONS.has(body.frequency_type)) {
    return {
      valid: false,
      message: 'frequency_type 格式不正確',
      code: 'INVALID_FREQUENCY'
    }
  }

  if (!isValidDateString(body.cycle_anchor_date)) {
    return {
      valid: false,
      message: 'cycle_anchor_date 格式必須為 YYYY-MM-DD',
      code: 'INVALID_DATE'
    }
  }

  if (
    body.frequency_type === 'every_n_days' &&
    parsePositiveInteger(body.interval_days) === null &&
    !body.medication_id
  ) {
    return {
      valid: false,
      message: 'every_n_days 模式需要提供 interval_days',
      code: 'MISSING_INTERVAL'
    }
  }

  if (body.route && !sanitizeRoute(body.route)) {
    return {
      valid: false,
      message: 'route 格式不正確',
      code: 'INVALID_ROUTE'
    }
  }

  return { valid: true }
}

function sanitizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeRoute(value: unknown): MedicationRegimenRow['route'] | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase() as NonNullable<
    MedicationRegimenRow['route']
  >
  return ROUTE_OPTIONS.has(normalized)
    ? (normalized as MedicationRegimenRow['route'])
    : null
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 0 ? Math.floor(value) : null
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
  }
  return null
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function sanitizeReminderPreferences(value: unknown): ReminderPreferencesInput | undefined {
  if (!value || typeof value !== 'object') return undefined

  const prefs: ReminderPreferencesInput = {}
  const source = value as Record<string, unknown>

  if (typeof source.title === 'string' && source.title.trim().length > 0) {
    prefs.title = source.title.trim()
  }

  if (
    typeof source.schedule_type === 'string' &&
    REMINDER_SCHEDULE_OPTIONS.has(source.schedule_type as ReminderScheduleType)
  ) {
    prefs.schedule_type = source.schedule_type as ReminderScheduleType
  }

  if (source.interval_days !== undefined) {
    prefs.interval_days = parsePositiveInteger(source.interval_days) ?? null
  }

  if (typeof source.window_start === 'string') {
    prefs.window_start = source.window_start
  }

  if (typeof source.window_end === 'string') {
    prefs.window_end = source.window_end
  }

  if (typeof source.timezone === 'string' && source.timezone.trim().length > 0) {
    prefs.timezone = source.timezone.trim()
  }

  if (source.lead_time_minutes !== undefined) {
    prefs.lead_time_minutes = parsePositiveInteger(source.lead_time_minutes)
  }

  if (source.snooze_minutes !== undefined) {
    prefs.snooze_minutes = parsePositiveInteger(source.snooze_minutes)
  }

  if (
    typeof source.auto_dismiss_rule === 'string' &&
    AUTO_DISMISS_OPTIONS.has(source.auto_dismiss_rule as ReminderAutoDismiss)
  ) {
    prefs.auto_dismiss_rule = source.auto_dismiss_rule as ReminderAutoDismiss
  }

  if (typeof source.metadata === 'object' && source.metadata !== null && !Array.isArray(source.metadata)) {
    prefs.metadata = source.metadata as Record<string, Json>
  }

  if (
    typeof source.status === 'string' &&
    REMINDER_STATUS_OPTIONS.has(source.status as ReminderStatus)
  ) {
    prefs.status = source.status as ReminderStatus
  }

  if (typeof source.ios_visible === 'boolean') {
    prefs.ios_visible = source.ios_visible
  }

  return Object.keys(prefs).length > 0 ? prefs : undefined
}

async function fetchMedicationDefaults(
  supabase: SupabaseClient,
  medicationId?: string
): Promise<MedicationCatalogLookup | null> {
  if (!medicationId) return null

  const { data, error } = await supabase
    .from('medication_catalog')
    .select('id, route, default_interval_days, default_dosage, is_injection')
    .eq('id', medicationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as MedicationCatalogLookup | null) ?? null
}

function toRegimenWithCatalog(row: unknown): RegimenWithCatalog {
  return row as RegimenWithCatalog
}

function toRegimenRow(row: unknown): MedicationRegimenRow {
  return row as MedicationRegimenRow
}

function formatRegimen(row: RegimenWithCatalog) {
  return {
    ...row,
    medication_catalog: row.medication_catalog ?? null
  }
}

function resolveSyncOperation(
  status?: MedicationRegimenRow['status']
): SyncOperation {
  if (status === 'paused' || status === 'ended') return 'pause'
  if (status === 'active') return 'resume'
  return 'update'
}

async function invokeRegimenSync(
  supabase: SupabaseClient,
  regimenId: string,
  operation: SyncOperation,
  reminderPrefs?: ReminderPreferencesInput
) {
  const payload: Record<string, unknown> = {
    regimen_id: regimenId,
    operation
  }

  if (reminderPrefs && Object.keys(reminderPrefs).length > 0) {
    payload.reminder_preferences = reminderPrefs
  }

  const { data, error } = await supabase.functions.invoke('medication-regimen-sync', {
    body: payload
  })

  if (error) {
    throw new Error(error.message ?? 'MEDICATION_SYNC_FAILED')
  }

  if (data && data.success === false) {
    const syncError = new Error(data.error ?? 'MEDICATION_SYNC_FAILED')
    ;(syncError as any).code = data.code
    throw syncError
  }

  return data?.data ?? null
}

function badRequestResponse(message: string, code?: string) {
  return NextResponse.json(
    { success: false, error: message, code },
    { status: 400 }
  )
}

function notFoundResponse(message: string) {
  return NextResponse.json(
    { success: false, error: message, code: 'NOT_FOUND' },
    { status: 404 }
  )
}

function serverErrorResponse(message: string, detail?: string) {
  return NextResponse.json(
    { success: false, error: message, detail },
    { status: 500 }
  )
}

function databaseErrorResponse(error: PostgrestError, fallbackMessage: string) {
  console.error('[medication-regimens] database error', error)
  return NextResponse.json(
    {
      success: false,
      error: fallbackMessage,
      detail: error.message,
      code: error.code
    },
    { status: 500 }
  )
}
