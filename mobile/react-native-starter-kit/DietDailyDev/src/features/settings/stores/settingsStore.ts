import { create } from 'zustand'
import { DEFAULT_SETTINGS, type UserSettings } from '../types'
import { SettingsService } from '../services/SettingsService'

interface SettingsStore {
  settings: UserSettings
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initializeSettings: (userId: string) => Promise<void>
  updateSettings: (userId: string, partial: Partial<UserSettings>) => Promise<void>
  resetSettings: () => void
  subscribeToChanges: (userId: string) => (() => void) | null
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isInitialized: false,

  /**
   * Initialize settings from Supabase
   */
  initializeSettings: async (userId: string) => {
    if (get().isInitialized) {
      return // Already initialized
    }

    set({ isLoading: true })

    try {
      const settings = await SettingsService.getUserSettings(userId)

      if (settings) {
        set({
          settings,
          isLoading: false,
          isInitialized: true
        })
      } else {
        // Use default settings if fetch fails
        set({
          settings: DEFAULT_SETTINGS,
          isLoading: false,
          isInitialized: true
        })
      }
    } catch (error) {
      console.error('[SettingsStore] Error initializing settings:', error)
      set({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        isInitialized: true
      })
    }
  },

  /**
   * Update settings in Supabase and local state
   */
  updateSettings: async (userId: string, partial: Partial<UserSettings>) => {
    const currentSettings = get().settings
    const newSettings = { ...currentSettings, ...partial }

    // Optimistic update
    set({ settings: newSettings })

    try {
      const updatedSettings = await SettingsService.updateUserSettings(userId, partial)

      if (updatedSettings) {
        set({ settings: updatedSettings })
      } else {
        console.warn('[SettingsStore] Remote update skipped, keeping local settings only')
      }
    } catch (error) {
      console.error('[SettingsStore] Error updating settings:', error)
      // Revert on error
      set({ settings: currentSettings })
    }
  },

  /**
   * Reset to default settings (local only)
   */
  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS })
  },

  /**
   * Subscribe to real-time settings changes
   */
  subscribeToChanges: (userId: string) => {
    try {
      return SettingsService.subscribeToSettings(userId, (settings) => {
        if (settings) {
          console.log('[SettingsStore] Settings updated from subscription:', settings)
          set({ settings })
        }
      })
    } catch (error) {
      console.error('[SettingsStore] Error subscribing to settings changes:', error)
      return null
    }
  },
}))
