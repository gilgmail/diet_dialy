export interface MealReminderConfig {
  breakfast: string // HH:mm format
  lunch: string
  dinner: string
}

export interface UserSettings {
  timezone: string // e.g., 'Asia/Taipei'
  timezoneOffset: string // e.g., '+08:00'
  chronicDisease: string | null
  knownAllergies: string[] // 已知過敏原
  mealReminders: MealReminderConfig
  notificationsEnabled: boolean
  debugMode?: boolean // Debug 模式開關
  customPrompt?: string // 自訂 AI 提示詞
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
