import { supabase } from '@/shared/api/supabase/client'
import {
  CHRONIC_DISEASES,
  DEFAULT_SETTINGS,
  TIMEZONES,
  type MealReminderConfig,
  type UserSettings,
  type ChronicDiseaseValue,
  type ModuleToggleSettings,
} from '../types'

interface DbUserRow {
  id: string
  timezone: string | null
  medical_conditions: unknown
  allergies: unknown
  preferences: unknown
  updated_at?: string
}

type MobileSettingsPreferences = {
  timezoneOffset?: string
  notificationsEnabled?: boolean
  mealReminders?: MealReminderConfig
  modules?: ModuleToggleSettings
  gamificationHeroEnabled?: boolean
}

const CHRONIC_DISEASE_VALUES = CHRONIC_DISEASES.map((item) => item.value)

function findChronicDisease(values: string[]): ChronicDiseaseValue | null {
  for (const condition of values) {
    const normalized = normalizeDiseaseValue(condition)
    const match = CHRONIC_DISEASES.find(
      (item) => normalizeDiseaseValue(item.value) === normalized
    )
    if (match) {
      return match.value
    }
  }
  return null
}

const normalizeDiseaseValue = (value: string) => value.replace(/\s*\(.*?\)\s*/g, '').trim()

function extractArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item
        if (item != null) return String(item)
        return null
      })
      .filter((item): item is string => !!item)
  }
  return []
}

function extractPreferences(preferences: unknown): Record<string, any> {
  if (preferences && typeof preferences === 'object' && !Array.isArray(preferences)) {
    return { ...(preferences as Record<string, any>) }
  }
  return {}
}

function extractMobileSettings(preferences: unknown): MobileSettingsPreferences {
  const prefObject = extractPreferences(preferences)
  const mobileSettingsRaw = prefObject.mobileSettings
  if (!mobileSettingsRaw || typeof mobileSettingsRaw !== 'object') {
    return {}
  }

  const mobileSettings = mobileSettingsRaw as Record<string, any>
  const result: MobileSettingsPreferences = {}

  if (typeof mobileSettings.notificationsEnabled === 'boolean') {
    result.notificationsEnabled = mobileSettings.notificationsEnabled
  }

  if (typeof mobileSettings.timezoneOffset === 'string') {
    result.timezoneOffset = mobileSettings.timezoneOffset
  }

  if (mobileSettings.mealReminders && typeof mobileSettings.mealReminders === 'object') {
    const reminders = mobileSettings.mealReminders as Record<string, any>
    const merged: MealReminderConfig = {
      ...DEFAULT_SETTINGS.mealReminders,
      ...reminders,
    }
    result.mealReminders = merged
  }

  if (mobileSettings.modules && typeof mobileSettings.modules === 'object') {
    const modules = mobileSettings.modules as Record<string, any>
    // 向後兼容：如果沒有 modules.hero 但有 gamificationHeroEnabled，則遷移它
    const heroValue =
      typeof modules.hero === 'boolean'
        ? modules.hero
        : typeof mobileSettings.gamificationHeroEnabled === 'boolean'
          ? mobileSettings.gamificationHeroEnabled
          : DEFAULT_SETTINGS.modules?.hero ?? true

    const merged: ModuleToggleSettings = {
      medication:
        typeof modules.medication === 'boolean'
          ? modules.medication
          : DEFAULT_SETTINGS.modules?.medication ?? true,
      sleep:
        typeof modules.sleep === 'boolean'
          ? modules.sleep
          : DEFAULT_SETTINGS.modules?.sleep ?? true,
      activity:
        typeof modules.activity === 'boolean'
          ? modules.activity
          : DEFAULT_SETTINGS.modules?.activity ?? true,
      hero: heroValue,
    }
    result.modules = merged
  } else if (typeof mobileSettings.gamificationHeroEnabled === 'boolean') {
    // 如果沒有 modules 但有 gamificationHeroEnabled，建立 modules 並遷移
    result.modules = {
      ...DEFAULT_SETTINGS.modules!,
      hero: mobileSettings.gamificationHeroEnabled,
    }
  }

  if (typeof mobileSettings.gamificationHeroEnabled === 'boolean') {
    result.gamificationHeroEnabled = mobileSettings.gamificationHeroEnabled
  }

  return result
}

function mergeMobileSettings(
  existingPreferences: unknown,
  updates: MobileSettingsPreferences
): Record<string, any> {
  const base = extractPreferences(existingPreferences)
  const existingMobile =
    base.mobileSettings && typeof base.mobileSettings === 'object'
      ? { ...(base.mobileSettings as Record<string, any>) }
      : {}

  if (updates.notificationsEnabled !== undefined) {
    existingMobile.notificationsEnabled = updates.notificationsEnabled
  }
  if (updates.timezoneOffset !== undefined) {
    existingMobile.timezoneOffset = updates.timezoneOffset
  }
  if (updates.mealReminders) {
    existingMobile.mealReminders = updates.mealReminders
  }
  if (updates.modules) {
    existingMobile.modules = {
      ...(existingMobile.modules || {}),
      ...updates.modules,
    }
  }
  if (typeof updates.gamificationHeroEnabled === 'boolean') {
    existingMobile.gamificationHeroEnabled = updates.gamificationHeroEnabled
  }

  if (Object.keys(existingMobile).length > 0) {
    base.mobileSettings = existingMobile
  } else if ('mobileSettings' in base) {
    delete base.mobileSettings
  }

  return base
}

export class SettingsService {
  /**
   * Get user settings from Supabase diet_daily_users table
   */
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('diet_daily_users')
        .select('id, timezone, medical_conditions, allergies, preferences, updated_at')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[SettingsService] Error fetching settings:', error)
        return { ...DEFAULT_SETTINGS }
      }

      if (!data) {
        console.warn('[SettingsService] diet_daily_users row not found; returning defaults')
        return { ...DEFAULT_SETTINGS }
      }

      return this.transformFromDatabase(data as DbUserRow)
    } catch (error) {
      console.error('[SettingsService] Unexpected error fetching settings:', error)
      return { ...DEFAULT_SETTINGS }
    }
  }

  /**
   * Create default settings in preferences (best-effort)
   */
  static async createDefaultSettings(userId: string): Promise<UserSettings | null> {
    await this.updateUserSettings(userId, DEFAULT_SETTINGS)
    return { ...DEFAULT_SETTINGS }
  }

  /**
   * Update user settings
   */
  static async updateUserSettings(
    userId: string,
    settings: Partial<UserSettings>
  ): Promise<UserSettings | null> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('diet_daily_users')
        .select('id, timezone, medical_conditions, allergies, preferences, updated_at')
        .eq('id', userId)
        .maybeSingle()

      if (fetchError) {
        console.error('[SettingsService] Failed to read existing profile:', fetchError)
        return null
      }

      if (!existing) {
        console.warn('[SettingsService] No diet_daily_users profile found; skipping remote update')
        return { ...DEFAULT_SETTINGS, ...settings }
      }

      const updatePayload: Record<string, any> = {}
      const mobilePreferenceUpdates: MobileSettingsPreferences = {}

      if (settings.timezone !== undefined) {
        updatePayload.timezone = settings.timezone
      }
      if (settings.timezoneOffset !== undefined) {
        mobilePreferenceUpdates.timezoneOffset = settings.timezoneOffset
      }
      if (settings.notificationsEnabled !== undefined) {
        mobilePreferenceUpdates.notificationsEnabled = settings.notificationsEnabled
      }
      if (settings.mealReminders) {
        mobilePreferenceUpdates.mealReminders = {
          ...DEFAULT_SETTINGS.mealReminders,
          ...settings.mealReminders,
        }
      }
      if (settings.modules) {
        mobilePreferenceUpdates.modules = {
          ...DEFAULT_SETTINGS.modules,
          ...settings.modules,
        }
      }
      if (settings.gamificationHeroEnabled !== undefined) {
        mobilePreferenceUpdates.gamificationHeroEnabled = settings.gamificationHeroEnabled
      }

      if (settings.chronicDisease !== undefined) {
        const existingConditions = extractArray(existing.medical_conditions)
        const filteredConditions = existingConditions.filter((condition) => {
          const normalized = normalizeDiseaseValue(condition)
          return !CHRONIC_DISEASE_VALUES.some(
            (value) => normalizeDiseaseValue(value) === normalized
          )
        })

        if (settings.chronicDisease) {
          updatePayload.medical_conditions = [settings.chronicDisease, ...filteredConditions]
        } else {
          updatePayload.medical_conditions = filteredConditions
        }
      }

      if (settings.knownAllergies !== undefined) {
        updatePayload.allergies = settings.knownAllergies
      }

      // 如果更新了 modules.hero，同時更新 gamificationHeroEnabled 以保持向後兼容
      if (updates.modules?.hero !== undefined) {
        mobilePreferenceUpdates.gamificationHeroEnabled = updates.modules.hero
      }

      const hasPreferenceUpdates =
        mobilePreferenceUpdates.notificationsEnabled !== undefined ||
        mobilePreferenceUpdates.mealReminders !== undefined ||
        mobilePreferenceUpdates.timezoneOffset !== undefined ||
        mobilePreferenceUpdates.modules !== undefined ||
        mobilePreferenceUpdates.gamificationHeroEnabled !== undefined

      if (hasPreferenceUpdates) {
        updatePayload.preferences = mergeMobileSettings(
          existing.preferences,
          mobilePreferenceUpdates
        )
      }

      let updatedRow: DbUserRow = existing as DbUserRow

      if (Object.keys(updatePayload).length > 0) {
        const { data, error } = await supabase
          .from('diet_daily_users')
          .update(updatePayload)
          .eq('id', userId)
          .select('id, timezone, medical_conditions, allergies, preferences, updated_at')
          .single()

        if (error) {
          console.error('[SettingsService] Error updating settings:', error)
          return null
        }

        updatedRow = data as DbUserRow
      }

      return this.transformFromDatabase(updatedRow)
    } catch (error) {
      console.error('[SettingsService] Unexpected error updating settings:', error)
      return null
    }
  }

  /**
   * Subscribe to settings changes (for real-time sync)
   */
  static subscribeToSettings(
    userId: string,
    callback: (settings: UserSettings | null) => void
  ) {
    const channel = supabase
      .channel(`diet_daily_users:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diet_daily_users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('[SettingsService] Settings changed:', payload)
          if (payload.eventType === 'DELETE') {
            callback(null)
          } else if (payload.new) {
            callback(this.transformFromDatabase(payload.new as DbUserRow))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Transform database record to app format
   */
  private static transformFromDatabase(data: DbUserRow): UserSettings {
    const timezone = data.timezone ?? DEFAULT_SETTINGS.timezone
    const timezoneConfig = TIMEZONES.find((tz) => tz.value === timezone)
    const conditions = extractArray(data.medical_conditions)
    const chronicDisease = findChronicDisease(conditions)

    const allergies = extractArray(data.allergies)
    const mobileSettings = extractMobileSettings(data.preferences)

    return {
      timezone,
      timezoneOffset:
        mobileSettings.timezoneOffset ??
        timezoneConfig?.offset ??
        DEFAULT_SETTINGS.timezoneOffset,
      chronicDisease,
      knownAllergies: allergies,
      notificationsEnabled:
        mobileSettings.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
      mealReminders: mobileSettings.mealReminders ?? { ...DEFAULT_SETTINGS.mealReminders },
      modules: mobileSettings.modules ?? {
        ...DEFAULT_SETTINGS.modules!,
        // 向後兼容：如果沒有 modules.hero 但有 gamificationHeroEnabled，使用它
        hero:
          mobileSettings.modules?.hero ??
          mobileSettings.gamificationHeroEnabled ??
          DEFAULT_SETTINGS.modules?.hero ??
          true,
      },
      gamificationHeroEnabled:
        mobileSettings.modules?.hero ??
        mobileSettings.gamificationHeroEnabled ??
        DEFAULT_SETTINGS.gamificationHeroEnabled,
    }
  }
}
