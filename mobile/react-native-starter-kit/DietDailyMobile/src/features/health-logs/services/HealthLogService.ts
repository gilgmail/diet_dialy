import { supabase } from '@/shared/api/supabase/client'
import {
  type AdherenceStatus,
  type ActivitySessionEntry,
  type CreateActivitySessionInput,
  type CreateMedicationAdministrationInput,
  type CreateSleepSessionInput,
  type MedicationLogEntry,
  type MedicationRegimenSummary,
  type RecentActivityTemplate,
  type SleepSessionEntry,
} from '../types'

type SupabaseClient = typeof supabase extends infer T ? T : never

const client = supabase as SupabaseClient

function formatTimeOnly(date: Date | null | undefined) {
  if (!date) return null
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}:00`
}

function minutesBetween(start?: Date | null, end?: Date | null) {
  if (!start || !end) return null
  const diffMs = end.getTime() - start.getTime()
  if (Number.isNaN(diffMs) || diffMs <= 0) return null
  return Math.round(diffMs / 60000)
}

export class HealthLogService {
  static async getActiveRegimens(userId: string): Promise<MedicationRegimenSummary[]> {
    const { data, error } = await (client as any)
      .from('medication_regimens')
      .select(
        'id, custom_name, default_dose, frequency_type, interval_days, route, status, medication_catalog(name, default_dosage)'
      )
      .eq('medication_regimens.user_id', userId)
      .eq('user_id', userId)
      .not('status', 'eq', 'ended')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      custom_name: row.custom_name,
      medication_name: row.medication_catalog?.name ?? undefined,
      default_dose: row.default_dose ?? row.medication_catalog?.default_dosage ?? undefined,
      frequency_type: row.frequency_type,
      interval_days: row.interval_days ?? undefined,
      route: row.route ?? undefined,
      status: row.status,
    }))
  }

  static async logMedicationAdministration(
    userId: string,
    input: CreateMedicationAdministrationInput
  ) {
    const payload: Record<string, any> = {
      regimen_id: input.regimen_id,
      taken_at: input.taken_at,
      captured_via: 'manual',
      detail_payload: {},
      vitals_snapshot: {},
      side_effects: [],
    }

    if (input.dose) payload.dose = input.dose
    if (input.route) payload.route = input.route
    if (typeof input.symptom_triggered === 'boolean') {
      payload.symptom_triggered = input.symptom_triggered
    }
    if (input.symptom_notes) payload.symptom_notes = input.symptom_notes
    if (input.adherence_status) payload.adherence_status = input.adherence_status
    if (input.notes) payload.notes = input.notes

    const { error } = await (client as any)
      .from('medication_administrations')
      .insert(payload)

    if (error) throw error
  }

  static async deleteMedicationLog(logId: string) {
    const { error } = await (client as any)
      .from('medication_administrations')
      .delete()
      .eq('id', logId)

    if (error) throw error
  }

  static async logSleepSession(userId: string, input: CreateSleepSessionInput) {
    const payload: Record<string, any> = {
      user_id: userId,
      source: 'manual',
      capture_method: 'ios_manual',
      detail_payload: input.detail_payload ?? {},
    }

    if (input.planned_start_time) payload.planned_start_time = input.planned_start_time
    if (typeof input.planned_duration_minutes === 'number') {
      payload.planned_duration_minutes = input.planned_duration_minutes
    }
    if (input.start_time) payload.start_time = input.start_time
    if (input.end_time) payload.end_time = input.end_time

    if (typeof input.duration_minutes === 'number') {
      payload.duration_minutes = input.duration_minutes
    }

    if (typeof input.is_main_sleep === 'boolean') {
      payload.is_main_sleep = input.is_main_sleep
    }
    if (typeof input.quality_score === 'number') {
      payload.quality_score = input.quality_score
    }

    const { error } = await (client as any).from('sleep_sessions').insert(payload)
    if (error) throw error
  }

  static async deleteSleepSession(sessionId: string) {
    const { error } = await (client as any)
      .from('sleep_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
  }

  static async logActivitySession(userId: string, input: CreateActivitySessionInput) {
    const payload: Record<string, any> = {
      user_id: userId,
      activity_type: input.activity_type,
      source: 'manual',
      capture_method: 'ios_manual',
      detail_payload: input.detail_payload ?? {},
    }

    if (input.activity_title) payload.activity_title = input.activity_title
    if (input.intensity) payload.intensity = input.intensity
    if (input.start_time) payload.start_time = input.start_time
    if (input.end_time) payload.end_time = input.end_time
    if (typeof input.duration_minutes === 'number') {
      payload.duration_minutes = input.duration_minutes
    }
    if (typeof input.calories === 'number') payload.calories = input.calories
    if (typeof input.steps === 'number') payload.steps = input.steps
    if (input.notes) payload.notes = input.notes

    const { error } = await (client as any).from('activity_sessions').insert(payload)
    if (error) throw error
  }

  static async deleteActivitySession(sessionId: string) {
    const { error } = await (client as any)
      .from('activity_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
  }

  static async getMedicationLogsByDate(
    userId: string,
    date: Date
  ): Promise<MedicationLogEntry[]> {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const { data, error } = await (client as any)
      .from('medication_administrations')
      .select(
        `
        id,
        taken_at,
        dose,
        adherence_status,
        symptom_triggered,
        notes,
        medication_regimens!inner (
          route,
          custom_name,
          medication_catalog(name)
        )
      `
      )
      .gte('taken_at', start.toISOString())
      .lt('taken_at', end.toISOString())
      .order('taken_at', { ascending: false })

    if (error) {
      console.warn('[HealthLogService] getMedicationLogsByDate failed', error)
      return []
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      taken_at: row.taken_at,
      dose: row.dose,
      adherence_status: row.adherence_status,
      symptom_triggered: row.symptom_triggered,
      notes: row.notes,
      regimen_name:
        row.medication_regimens?.custom_name ||
        row.medication_regimens?.medication_catalog?.name ||
        '療程',
      regimen_route: row.medication_regimens?.route ?? undefined,
    }))
  }

  static async getSleepSessionsByDate(
    userId: string,
    date: Date
  ): Promise<SleepSessionEntry[]> {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const { data, error } = await (client as any)
      .from('sleep_sessions')
      .select(
        'id, start_time, end_time, duration_minutes, planned_start_time, planned_duration_minutes, quality_score, is_main_sleep'
      )
      .eq('user_id', userId)
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[HealthLogService] getSleepSessionsByDate failed', error)
      return []
    }

    return data ?? []
  }

  static async getActivitySessionsByDate(
    userId: string,
    date: Date
  ): Promise<ActivitySessionEntry[]> {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const { data, error } = await (client as any)
      .from('activity_sessions')
      .select(
        'id, activity_type, activity_title, intensity, duration_minutes, start_time, end_time, notes'
      )
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[HealthLogService] getActivitySessionsByDate failed', error)
      return []
    }

    return data ?? []
  }

  static async getRecentActivities(userId: string): Promise<RecentActivityTemplate[]> {
    const { data, error } = await (client as any)
      .from('activity_sessions')
      .select(
        'id, activity_type, activity_title, intensity, duration_minutes'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.warn('[HealthLogService] getRecentActivities failed', error)
      return []
    }

    const uniqueMap = new Map<string, RecentActivityTemplate>()
    for (const entry of data ?? []) {
      const key = `${entry.activity_type}-${entry.activity_title ?? ''}`.toLowerCase()
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, entry)
      }
      if (uniqueMap.size >= 5) break
    }
    return Array.from(uniqueMap.values())
  }

  static buildMedicationInput(params: {
    regimenId: string
    takenAt: Date
    dose?: string
    route?: 'oral' | 'injection' | 'other'
    symptomTriggered?: boolean
    symptomNotes?: string
    adherenceStatus?: AdherenceStatus
    notes?: string
  }): CreateMedicationAdministrationInput {
    return {
      regimen_id: params.regimenId,
      taken_at: params.takenAt.toISOString(),
      dose: params.dose,
      route: params.route,
      symptom_triggered: params.symptomTriggered,
      symptom_notes: params.symptomNotes,
      adherence_status: params.adherenceStatus,
      notes: params.notes,
    }
  }

  static buildSleepInput(params: {
    plannedStart?: Date | null
    plannedDuration?: number | null
    actualStart?: Date | null
    actualEnd?: Date | null
    isMainSleep?: boolean
    qualityScore?: number | null
    notes?: string
  }): CreateSleepSessionInput {
    const startTime = params.actualStart ? params.actualStart.toISOString() : undefined
    const endTime = params.actualEnd ? params.actualEnd.toISOString() : undefined
    const duration =
      minutesBetween(params.actualStart, params.actualEnd) ??
      params.plannedDuration ??
      null

    return {
      planned_start_time: formatTimeOnly(params.plannedStart),
      planned_duration_minutes: params.plannedDuration ?? null,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: duration ?? undefined,
      is_main_sleep: params.isMainSleep,
      quality_score: params.qualityScore ?? undefined,
      detail_payload: params.notes ? { notes: params.notes } : undefined,
    }
  }

  static buildActivityInput(params: {
    activityType: string
    title?: string
    intensity?: 'low' | 'moderate' | 'high' | string | null
    startTime?: Date | null
    endTime?: Date | null
    durationMinutes?: number | null
    calories?: number | null
    steps?: number | null
    notes?: string
  }): CreateActivitySessionInput {
    return {
      activity_type: params.activityType,
      activity_title: params.title,
      intensity: params.intensity ?? undefined,
      start_time: params.startTime ? params.startTime.toISOString() : undefined,
      end_time: params.endTime ? params.endTime.toISOString() : undefined,
      duration_minutes: params.durationMinutes ?? minutesBetween(params.startTime, params.endTime),
      calories: params.calories ?? undefined,
      steps: params.steps ?? undefined,
      notes: params.notes,
    }
  }
}
