export interface MealReminderConfig {
  breakfast: string // HH:mm format
  lunch: string
  dinner: string
}

export type ChronicDiseaseValue = typeof CHRONIC_DISEASES[number]['value']

export interface UserSettings {
  timezone: string // e.g., 'Asia/Taipei'
  timezoneOffset: string // e.g., '+08:00'
  chronicDisease: ChronicDiseaseValue | null
  knownAllergies: string[] // 已知過敏原
  mealReminders: MealReminderConfig
  notificationsEnabled: boolean
  debugMode?: boolean // Debug 模式開關
  customPrompt?: string // 自訂 AI 提示詞
  modules?: ModuleToggleSettings
  gamificationHeroEnabled?: boolean
  // 症狀和排便記錄提醒設置
  symptomReminderEnabled?: boolean // 是否啟用症狀記錄提醒
  symptomReminderTime?: string // 症狀記錄提醒時間（HH:mm 格式，預設 21:00）
  bowelReminderEnabled?: boolean // 是否啟用排便記錄提醒
  bowelReminderTime?: string // 排便記錄提醒時間（HH:mm 格式，預設 21:00）
  enableBackfillReminder?: boolean // 是否啟用補記提醒（預設 true）
}

export interface ModuleToggleSettings {
  medication: boolean
  sleep: boolean
  activity: boolean
  hero: boolean // 健康冒險摘要模式（Gamification Hero）
}

export const DEFAULT_SETTINGS: UserSettings = {
  timezone: 'Asia/Taipei',
  timezoneOffset: '+08:00',
  chronicDisease: null,
  knownAllergies: [],
  mealReminders: {
    breakfast: '08:00',
    lunch: '12:30',
    dinner: '18:30',
  },
  notificationsEnabled: true,
  debugMode: false,
  customPrompt: '',
  modules: {
    medication: true,
    sleep: true,
    activity: true,
    hero: true, // 健康冒險摘要模式（Gamification Hero）
  },
  gamificationHeroEnabled: true, // 保留以維持向後兼容性，但建議使用 modules.hero
  // 症狀和排便記錄提醒預設值
  symptomReminderEnabled: true,
  symptomReminderTime: '21:00',
  bowelReminderEnabled: true,
  bowelReminderTime: '21:00',
  enableBackfillReminder: true,
}

export const CHRONIC_DISEASES = [
  { value: '發炎性腸病 (IBD)', label: '發炎性腸病 (IBD)' },
  { value: '克隆氏症', label: '克隆氏症' },
  { value: '潰瘍性結腸炎', label: '潰瘍性結腸炎' },
  { value: '腸躁症 (IBS)', label: '腸躁症 (IBS)' },
  { value: '癌症治療中', label: '癌症治療中' },
] as const

export const COMMON_ALLERGENS = [
  '牛奶',
  '雞蛋',
  '花生',
  '堅果',
  '大豆',
  '小麥',
  '魚類',
  '甲殼類',
  '芝麻',
  '芒果',
] as const

export const TIMEZONES = [
  { value: 'Asia/Taipei', label: '台北 (GMT+8)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: '東京 (GMT+9)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: '上海 (GMT+8)', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: '香港 (GMT+8)', offset: '+08:00' },
  { value: 'Asia/Singapore', label: '新加坡 (GMT+8)', offset: '+08:00' },
  { value: 'America/New_York', label: '紐約 (GMT-5)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: '洛杉磯 (GMT-8)', offset: '-08:00' },
  { value: 'Europe/London', label: '倫敦 (GMT+0)', offset: '+00:00' },
] as const
