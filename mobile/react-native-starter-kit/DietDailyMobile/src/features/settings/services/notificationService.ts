import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { MealReminderConfig } from '../types'

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // shouldShowAlert deprecated; use banner/list flags for iOS >= 14
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const MEAL_NOTIFICATION_IDS = {
  breakfast: 'meal-reminder-breakfast',
  lunch: 'meal-reminder-lunch',
  dinner: 'meal-reminder-dinner',
}

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error('[NotificationService] Error requesting permissions:', error)
      return false
    }
  }

  static async scheduleMealReminders(config: MealReminderConfig): Promise<void> {
    try {
      // Cancel existing reminders
      await this.cancelAllMealReminders()

      const hasPermission = await this.requestPermissions()
      if (!hasPermission) {
        console.warn('[NotificationService] No permission to schedule notifications')
        return
      }

      // Schedule breakfast reminder
      await this.scheduleMealNotification(
        MEAL_NOTIFICATION_IDS.breakfast,
        '早餐時間到了！',
        '記得記錄您的早餐內容',
        config.breakfast
      )

      // Schedule lunch reminder
      await this.scheduleMealNotification(
        MEAL_NOTIFICATION_IDS.lunch,
        '午餐時間到了！',
        '記得記錄您的午餐內容',
        config.lunch
      )

      // Schedule dinner reminder
      await this.scheduleMealNotification(
        MEAL_NOTIFICATION_IDS.dinner,
        '晚餐時間到了！',
        '記得記錄您的晚餐內容',
        config.dinner
      )

      console.log('[NotificationService] Meal reminders scheduled successfully')
    } catch (error) {
      console.error('[NotificationService] Error scheduling meal reminders:', error)
    }
  }

  private static async scheduleMealNotification(
    identifier: string,
    title: string,
    body: string,
    time: string // HH:mm format
  ): Promise<void> {
    const [hours, minutes] = time.split(':').map(Number)

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && {
          channelId: 'meal-reminders',
        }),
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    })
  }

  static async cancelAllMealReminders(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(MEAL_NOTIFICATION_IDS.breakfast)
      await Notifications.cancelScheduledNotificationAsync(MEAL_NOTIFICATION_IDS.lunch)
      await Notifications.cancelScheduledNotificationAsync(MEAL_NOTIFICATION_IDS.dinner)
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
}
