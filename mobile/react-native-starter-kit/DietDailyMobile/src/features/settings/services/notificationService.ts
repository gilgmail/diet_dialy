import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { MealReminderConfig } from '../types'

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

function extractCalendarTrigger(trigger: Notifications.NotificationTrigger | null | undefined) {
  if (!trigger || typeof trigger !== 'object') {
    return null
  }

  if ('type' in trigger && trigger.type === 'calendar') {
    return trigger as Notifications.CalendarTrigger & {
      value?: { hour?: number; minute?: number }
    }
  }

  return null
}

function extractHourMinute(trigger: Notifications.NotificationTrigger | null | undefined) {
  const calendarTrigger = extractCalendarTrigger(trigger)
  if (!calendarTrigger) {
    return { hour: undefined, minute: undefined }
  }

  const value = (calendarTrigger as { value?: { hour?: number; minute?: number } }).value
  const hour = calendarTrigger.hour ?? value?.hour
  const minute = calendarTrigger.minute ?? value?.minute

  return { hour, minute }
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
    config: MealReminderConfig,
    options: { force?: boolean; meals?: MealKey[] } = {}
  ): Promise<void> {
    const { force = false, meals } = options
    const targetMeals = (meals ?? Object.keys(config)) as MealKey[]

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

        if (
          !force &&
          existing &&
          hour !== undefined &&
          minute !== undefined &&
          this.isSameSchedule(existing, hour, minute)
        ) {
          continue
        }

        if (existing) {
          await Notifications.cancelScheduledNotificationAsync(existing.identifier)
        }

        await this.scheduleMealNotification(meal, time)
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

  private static async scheduleMealNotification(meal: MealKey, time: string): Promise<void> {
    const hasPermission = await ensureNotificationPermissions()
    if (!hasPermission) {
      return
    }

    const { hour, minute } = parseTime(time)
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      console.warn('[NotificationService] Invalid time provided for', meal, time)
      return
    }

    const nextTrigger = this.getNextTriggerDate(time)
    const identifier = MEAL_NOTIFICATION_IDS[meal]

    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})
    await Notifications.dismissNotificationAsync(identifier).catch(() => {})

    const trigger: Notifications.CalendarNotificationTriggerInput = {
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
        ...(Platform.OS === 'android' && {
          channelId: 'meal-reminders',
        }),
      },
      trigger,
    })
  }

  private static getNextTriggerDate(time: string): Date {
    const { hour, minute } = parseTime(time)
    const now = new Date()
    const trigger = new Date(now)
    trigger.setHours(hour ?? 0, minute ?? 0, 0, 0)

    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1)
    }

    return trigger
  }

  static async cancelAllMealReminders(): Promise<void> {
    try {
      for (const identifier of Object.values(MEAL_NOTIFICATION_IDS)) {
        await Notifications.cancelScheduledNotificationAsync(identifier)
      }
      console.log('[NotificationService] All meal reminders cancelled')
    } catch (error) {
      console.error('[NotificationService] Error cancelling meal reminders:', error)
    }
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
}
