import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { BowelDiaryService } from '@/features/bowel-diary/services/BowelDiaryService'
import { useSettingsStore } from '../stores/settingsStore'
import type { MealReminderConfig } from '../types'
import { format, subDays } from 'date-fns'

type MealKey = keyof MealReminderConfig

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

const MEAL_NOTIFICATION_IDS: Record<MealKey, string> = {
  breakfast: 'meal-reminder-breakfast',
  lunch: 'meal-reminder-lunch',
  dinner: 'meal-reminder-dinner',
}
const MEAL_TITLES = new Set(Object.entries(MEAL_LABELS).map(([, label]) => `${label}時間到了！`))

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

type CalendarComponents = {
  hour?: number
  minute?: number
}

function extractHourMinute(trigger: Notifications.NotificationTrigger | null | undefined) {
  if (!trigger || typeof trigger !== 'object' || !('type' in trigger)) {
    return { hour: undefined, minute: undefined }
  }

  if (trigger.type === 'calendar') {
    const calendarTrigger = trigger as Notifications.CalendarNotificationTrigger
    const components = calendarTrigger.dateComponents ?? {}
    const fallback = (calendarTrigger as { value?: CalendarComponents }).value ?? {}
    return {
      hour: components.hour ?? fallback.hour,
      minute: components.minute ?? fallback.minute,
    }
  }

  return { hour: undefined, minute: undefined }
}

function parseTime(time: string) {
  const [hour, minute] = time.split(':').map((part) => Number.parseInt(part, 10))
  return { hour, minute }
}

async function ensureNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('[NotificationService] Permission not granted')
    return false
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: '用餐提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
    })
    await Notifications.setNotificationChannelAsync('health-reminders', {
      name: '健康記錄提醒',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#EF4444',
    })
  }

  return true
}

export class NotificationService {
  private static legacyRemindersPurged = false

  static async requestPermissions(): Promise<boolean> {
    try {
      return await ensureNotificationPermissions()
    } catch (error) {
      console.error('[NotificationService] Error requesting permissions:', error)
      return false
    }
  }

  static async scheduleMealReminders(
    userId: string,
    config: MealReminderConfig,
    options: { force?: boolean; meals?: MealKey[]; skipTodayMeals?: MealKey[] } = {}
  ): Promise<void> {
    const { force = false, meals, skipTodayMeals = [] } = options
    const targetMeals = (meals ?? Object.keys(config)) as MealKey[]
    const skipTodaySet = new Set(skipTodayMeals)

    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        console.warn('[NotificationService] No permission to schedule notifications')
        return
      }

       if (!this.legacyRemindersPurged) {
         await this.purgeLegacyReminders()
         this.legacyRemindersPurged = true
       }

      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      const scheduledMap = new Map<MealKey, Notifications.NotificationRequest>()
      for (const request of scheduled) {
        const mealEntry = (Object.entries(MEAL_NOTIFICATION_IDS) as Array<[MealKey, string]>).find(
          ([, id]) => id === request.identifier
        )
        if (mealEntry) {
          scheduledMap.set(mealEntry[0], request)
        }
      }

      for (const meal of targetMeals) {
        const time = config[meal]
        const { hour, minute } = parseTime(time)
        const existing = scheduledMap.get(meal)
        const loggedToday = await this.hasMealLoggedToday(userId, meal)
        const skipToday = skipTodaySet.has(meal) || loggedToday

        if (
          !force &&
          existing &&
          hour !== undefined &&
          minute !== undefined &&
          this.isSameSchedule(existing, hour, minute) &&
          !skipToday
        ) {
          continue
        }

        if (existing) {
          await Notifications.cancelScheduledNotificationAsync(existing.identifier)
        }

        await this.scheduleMealNotification(userId, meal, time, { skipToday })
      }

      console.log(
        '[NotificationService] Meal reminders scheduled (force=%s, meals=%s)',
        force,
        targetMeals.join(', ')
      )
    } catch (error) {
      console.error('[NotificationService] Error scheduling meal reminders:', error)
    }
  }

  private static isSameSchedule(
    request: Notifications.NotificationRequest,
    hour: number,
    minute: number
  ) {
    const { hour: existingHour, minute: existingMinute } = extractHourMinute(request.trigger)
    return existingHour === hour && existingMinute === minute
  }

  private static async scheduleMealNotification(
    userId: string,
    meal: MealKey,
    time: string,
    options: { skipToday?: boolean } = {}
  ): Promise<void> {
    const hasPermission = await ensureNotificationPermissions()
    if (!hasPermission) {
      return
    }

    const { hour, minute } = parseTime(time)
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      console.warn('[NotificationService] Invalid time provided for', meal, time)
      return
    }

    const skipToday =
      options.skipToday !== undefined ? options.skipToday : await this.hasMealLoggedToday(userId, meal)
    const nextTrigger = this.getNextTriggerDate(time, skipToday)
    const identifier = MEAL_NOTIFICATION_IDS[meal]

    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})
    await Notifications.dismissNotificationAsync(identifier).catch(() => {})

    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: nextTrigger.getHours(),
      minute: nextTrigger.getMinutes(),
      second: 0,
      repeats: true,
    }

    if (Platform.OS === 'ios') {
      trigger.weekday = nextTrigger.getDay() === 0 ? 1 : nextTrigger.getDay() + 1
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `${MEAL_LABELS[meal]}時間到了！`,
        body: '記得記錄您的飲食內容',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'meal-reminder',
          meal,
        },
        ...(Platform.OS === 'ios' && {
          summaryArgument: MEAL_LABELS[meal],
          summaryArgumentCount: 1,
          interruptionLevel: 'passive' as Notifications.NotificationContentInput['interruptionLevel'],
        }),
        ...(Platform.OS === 'android' && {
          channelId: 'meal-reminders',
        }),
      },
      trigger,
    })
  }

  private static getNextTriggerDate(time: string, skipToday = false): Date {
    const { hour, minute } = parseTime(time)
    const now = new Date()
    const trigger = new Date(now)
    trigger.setHours(hour ?? 0, minute ?? 0, 0, 0)

    if (skipToday || trigger <= now) {
      trigger.setDate(trigger.getDate() + 1)
    }

    return trigger
  }

  static async cancelAllMealReminders(): Promise<void> {
    try {
      for (const identifier of Object.values(MEAL_NOTIFICATION_IDS)) {
        await Notifications.cancelScheduledNotificationAsync(identifier)
      }
      this.legacyRemindersPurged = false
      console.log('[NotificationService] All meal reminders cancelled')
    } catch (error) {
      console.error('[NotificationService] Error cancelling meal reminders:', error)
    }
  }

  static async pauseRemindersForMeals(meals?: MealKey[]): Promise<void> {
    const targets = meals ?? (Object.keys(MEAL_NOTIFICATION_IDS) as MealKey[])
    await Promise.all(
      targets.map((meal) =>
        Notifications.cancelScheduledNotificationAsync(MEAL_NOTIFICATION_IDS[meal]).catch(() => {})
      )
    )
  }

  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync()
    } catch (error) {
      console.error('[NotificationService] Error getting scheduled notifications:', error)
      return []
    }
  }

  private static async purgeLegacyReminders(): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      const cancellations: Array<Promise<void>> = []

      for (const request of scheduled) {
        const isKnownIdentifier = Object.values(MEAL_NOTIFICATION_IDS).includes(
          request.identifier
        )
        const isTaggedReminder =
          request.content?.data &&
          typeof request.content.data === 'object' &&
          (request.content.data as Record<string, unknown>).type === 'meal-reminder'
        const isMatchingTitle =
          request.content?.title && MEAL_TITLES.has(request.content.title)

        if (isKnownIdentifier || isTaggedReminder || isMatchingTitle) {
          cancellations.push(
            Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => {})
          )
        }
      }

      if (cancellations.length) {
        await Promise.all(cancellations)
        console.log('[NotificationService] Purged legacy meal reminders:', cancellations.length)
      }
    } catch (error) {
      console.warn('[NotificationService] Failed to purge legacy reminders:', error)
    }
  }

  private static async hasMealLoggedToday(userId: string, meal: MealKey): Promise<boolean> {
    if (!userId) return false
    return FoodDiaryService.hasMealEntryForDate(userId, new Date(), meal)
  }

  static async deferMealReminderUntilTomorrow(userId: string, meal: MealKey) {
    const { settings } = useSettingsStore.getState()
    const time = settings.mealReminders[meal]
    if (!userId || !time) {
      return
    }

    await this.scheduleMealReminders(userId, settings.mealReminders, {
      force: true,
      meals: [meal],
      skipTodayMeals: [meal],
    })
  }

  /**
   * Schedule symptom reminder notification
   */
  static async scheduleSymptomReminder(userId: string, time?: string): Promise<void> {
    const { settings } = useSettingsStore.getState()
    const reminderTime = time ?? settings.symptomReminderTime ?? '21:00'
    const enabled = settings.symptomReminderEnabled ?? true

    if (!enabled || !settings.notificationsEnabled) {
      await Notifications.cancelScheduledNotificationAsync('symptom-reminder-daily')
      return
    }

    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        console.warn('[NotificationService] No permission to schedule symptom reminder')
        return
      }

      const { hour, minute } = parseTime(reminderTime)
      if (Number.isNaN(hour) || Number.isNaN(minute)) {
        console.warn('[NotificationService] Invalid time provided for symptom reminder:', reminderTime)
        return
      }

      // Check if user already has symptom entry today
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      const { data: entries } = await SymptomDiaryService.getSymptomEntriesByDateRange(
        userId,
        today,
        today
      )
      const hasEntryToday = entries && entries.length > 0

      if (hasEntryToday) {
        // Skip today, schedule for tomorrow
        const nextTrigger = this.getNextTriggerDate(reminderTime, true)
        await this.scheduleSymptomNotification(userId, nextTrigger)
      } else {
        // Schedule for today if time hasn't passed, otherwise tomorrow
        const nextTrigger = this.getNextTriggerDate(reminderTime, false)
        await this.scheduleSymptomNotification(userId, nextTrigger)
      }

      console.log('[NotificationService] Symptom reminder scheduled for', reminderTime)
    } catch (error) {
      console.error('[NotificationService] Error scheduling symptom reminder:', error)
    }
  }

  /**
   * Schedule bowel movement reminder notification
   */
  static async scheduleBowelReminder(userId: string, time?: string): Promise<void> {
    const { settings } = useSettingsStore.getState()
    const reminderTime = time ?? settings.bowelReminderTime ?? '21:00'
    const enabled = settings.bowelReminderEnabled ?? true

    if (!enabled || !settings.notificationsEnabled) {
      await Notifications.cancelScheduledNotificationAsync('bowel-reminder-daily')
      return
    }

    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        console.warn('[NotificationService] No permission to schedule bowel reminder')
        return
      }

      const { hour, minute } = parseTime(reminderTime)
      if (Number.isNaN(hour) || Number.isNaN(minute)) {
        console.warn('[NotificationService] Invalid time provided for bowel reminder:', reminderTime)
        return
      }

      // Check if user already has bowel entry today
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      const { data: entries } = await BowelDiaryService.getBowelMovementsByDateString(
        userId,
        todayStr
      )
      const hasEntryToday = entries && entries.length > 0

      if (hasEntryToday) {
        // Skip today, schedule for tomorrow
        const nextTrigger = this.getNextTriggerDate(reminderTime, true)
        await this.scheduleBowelNotification(userId, nextTrigger)
      } else {
        // Schedule for today if time hasn't passed, otherwise tomorrow
        const nextTrigger = this.getNextTriggerDate(reminderTime, false)
        await this.scheduleBowelNotification(userId, nextTrigger)
      }

      console.log('[NotificationService] Bowel reminder scheduled for', reminderTime)
    } catch (error) {
      console.error('[NotificationService] Error scheduling bowel reminder:', error)
    }
  }

  /**
   * Schedule symptom notification for specific date
   */
  private static async scheduleSymptomNotification(userId: string, triggerDate: Date): Promise<void> {
    const identifier = 'symptom-reminder-daily'

    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})

    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      second: 0,
      repeats: true,
    }

    if (Platform.OS === 'ios') {
      trigger.weekday = triggerDate.getDay() === 0 ? 1 : triggerDate.getDay() + 1
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: '記得記錄症狀',
        body: '今天還沒有記錄症狀，點擊快速記錄「無症狀」',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'symptom-reminder',
        },
        ...(Platform.OS === 'ios' && {
          summaryArgument: '症狀記錄',
          summaryArgumentCount: 1,
          interruptionLevel: 'passive' as Notifications.NotificationContentInput['interruptionLevel'],
        }),
        ...(Platform.OS === 'android' && {
          channelId: 'health-reminders',
        }),
      },
      trigger,
    })
  }

  /**
   * Schedule bowel notification for specific date
   */
  private static async scheduleBowelNotification(userId: string, triggerDate: Date): Promise<void> {
    const identifier = 'bowel-reminder-daily'

    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})

    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      second: 0,
      repeats: true,
    }

    if (Platform.OS === 'ios') {
      trigger.weekday = triggerDate.getDay() === 0 ? 1 : triggerDate.getDay() + 1
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: '記得記錄排便',
        body: '今天還沒有記錄排便數據',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'bowel-reminder',
        },
        ...(Platform.OS === 'ios' && {
          summaryArgument: '排便記錄',
          summaryArgumentCount: 1,
          interruptionLevel: 'passive' as Notifications.NotificationContentInput['interruptionLevel'],
        }),
        ...(Platform.OS === 'android' && {
          channelId: 'health-reminders',
        }),
      },
      trigger,
    })
  }

  /**
   * Check for missing entries from yesterday and send backfill reminder
   */
  static async checkAndRemindBackfill(userId: string): Promise<void> {
    const { settings } = useSettingsStore.getState()
    const enabled = settings.enableBackfillReminder ?? true

    if (!enabled || !settings.notificationsEnabled) {
      return
    }

    try {
      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        return
      }

      const yesterday = subDays(new Date(), 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

      // Check symptom entries
      const { data: symptomEntries } = await SymptomDiaryService.getSymptomEntriesByDateRange(
        userId,
        yesterday,
        yesterday
      )
      const hasSymptomEntry = symptomEntries && symptomEntries.length > 0

      // Check bowel entries
      const { data: bowelEntries } = await BowelDiaryService.getBowelMovementsByDateString(
        userId,
        yesterdayStr
      )
      const hasBowelEntry = bowelEntries && bowelEntries.length > 0

      // Send reminder if either is missing
      if (!hasSymptomEntry || !hasBowelEntry) {
        const missingItems: string[] = []
        if (!hasSymptomEntry) missingItems.push('症狀')
        if (!hasBowelEntry) missingItems.push('排便')

        const identifier = `backfill-reminder-${yesterdayStr}`
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: '補記提醒',
            body: `昨天（${yesterdayStr}）還沒有記錄${missingItems.join('和')}數據，點擊補記`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: {
              type: 'backfill-reminder',
              date: yesterdayStr,
              missingSymptom: !hasSymptomEntry,
              missingBowel: !hasBowelEntry,
            },
            ...(Platform.OS === 'ios' && {
              summaryArgument: '補記提醒',
              summaryArgumentCount: 1,
              interruptionLevel: 'passive' as Notifications.NotificationContentInput['interruptionLevel'],
            }),
            ...(Platform.OS === 'android' && {
              channelId: 'health-reminders',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1, // Send immediately
          },
        })

        console.log('[NotificationService] Backfill reminder sent for', yesterdayStr)
      }
    } catch (error) {
      console.error('[NotificationService] Error checking backfill:', error)
    }
  }

  /**
   * Cancel all health reminders (symptom and bowel)
   */
  static async cancelAllHealthReminders(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync('symptom-reminder-daily')
      await Notifications.cancelScheduledNotificationAsync('bowel-reminder-daily')
      
      // Cancel all backfill reminders
      const scheduled = await Notifications.getAllScheduledNotificationsAsync()
      for (const notification of scheduled) {
        if (notification.identifier.startsWith('backfill-reminder-')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier)
        }
      }

      console.log('[NotificationService] All health reminders cancelled')
    } catch (error) {
      console.error('[NotificationService] Error cancelling health reminders:', error)
    }
  }
}
