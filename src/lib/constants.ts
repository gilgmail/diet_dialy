// Medical application constants and configurations

// Symptom types with multilingual labels
export const SYMPTOM_TYPES = {
  abdominal_pain: {
    en: 'Abdominal Pain',
    'zh-TW': '腹痛',
    'zh-HK': '腹痛'
  },
  bloating: {
    en: 'Bloating',
    'zh-TW': '腹脹',
    'zh-HK': '腹脹'
  },
  diarrhea: {
    en: 'Diarrhea',
    'zh-TW': '腹瀉',
    'zh-HK': '腹瀉'
  },
  constipation: {
    en: 'Constipation',
    'zh-TW': '便祕',
    'zh-HK': '便祕'
  },
  nausea: {
    en: 'Nausea',
    'zh-TW': '噁心',
    'zh-HK': '噁心'
  },
  vomiting: {
    en: 'Vomiting',
    'zh-TW': '嘔吐',
    'zh-HK': '嘔吐'
  },
  fatigue: {
    en: 'Fatigue',
    'zh-TW': '疲勞',
    'zh-HK': '疲勞'
  },
  headache: {
    en: 'Headache',
    'zh-TW': '頭痛',
    'zh-HK': '頭痛'
  },
  skin_reaction: {
    en: 'Skin Reaction',
    'zh-TW': '皮膚反應',
    'zh-HK': '皮膚反應'
  },
  joint_pain: {
    en: 'Joint Pain',
    'zh-TW': '關節痛',
    'zh-HK': '關節痛'
  },
  mood_changes: {
    en: 'Mood Changes',
    'zh-TW': '情緒變化',
    'zh-HK': '情緒變化'
  },
  sleep_issues: {
    en: 'Sleep Issues',
    'zh-TW': '睡眠問題',
    'zh-HK': '睡眠問題'
  },
  appetite_changes: {
    en: 'Appetite Changes',
    'zh-TW': '食慾變化',
    'zh-HK': '食慾變化'
  },
  weight_changes: {
    en: 'Weight Changes',
    'zh-TW': '體重變化',
    'zh-HK': '體重變化'
  },
  fever: {
    en: 'Fever',
    'zh-TW': '發燒',
    'zh-HK': '發燒'
  },
  dehydration: {
    en: 'Dehydration',
    'zh-TW': '脫水',
    'zh-HK': '脫水'
  },
  other: {
    en: 'Other',
    'zh-TW': '其他',
    'zh-HK': '其他'
  }
} as const;

// Meal types with translations
export const MEAL_TYPES = {
  breakfast: {
    en: 'Breakfast',
    'zh-TW': '早餐',
    'zh-HK': '早餐'
  },
  lunch: {
    en: 'Lunch',
    'zh-TW': '午餐',
    'zh-HK': '午餐'
  },
  dinner: {
    en: 'Dinner',
    'zh-TW': '晚餐',
    'zh-HK': '晚餐'
  },
  snack: {
    en: 'Snack',
    'zh-TW': '點心',
    'zh-HK': '茶點'
  },
  beverage: {
    en: 'Beverage',
    'zh-TW': '飲料',
    'zh-HK': '飲品'
  },
  medication: {
    en: 'Medication',
    'zh-TW': '藥物',
    'zh-HK': '藥物'
  }
} as const;

// Food categories with translations
export const FOOD_CATEGORIES = {
  grains: {
    en: 'Grains & Cereals',
    'zh-TW': '穀物類',
    'zh-HK': '穀物類'
  },
  vegetables: {
    en: 'Vegetables',
    'zh-TW': '蔬菜類',
    'zh-HK': '蔬菜類'
  },
  fruits: {
    en: 'Fruits',
    'zh-TW': '水果類',
    'zh-HK': '水果類'
  },
  proteins: {
    en: 'Proteins',
    'zh-TW': '蛋白質類',
    'zh-HK': '蛋白質類'
  },
  dairy: {
    en: 'Dairy',
    'zh-TW': '乳製品',
    'zh-HK': '奶類製品'
  },
  fats_oils: {
    en: 'Fats & Oils',
    'zh-TW': '油脂類',
    'zh-HK': '油脂類'
  },
  beverages: {
    en: 'Beverages',
    'zh-TW': '飲料類',
    'zh-HK': '飲品類'
  },
  processed: {
    en: 'Processed Foods',
    'zh-TW': '加工食品',
    'zh-HK': '加工食品'
  },
  supplements: {
    en: 'Supplements',
    'zh-TW': '補充劑',
    'zh-HK': '營養補充品'
  },
  other: {
    en: 'Other',
    'zh-TW': '其他',
    'zh-HK': '其他'
  }
} as const;

// Common food units
export const FOOD_UNITS = {
  g: { en: 'grams', 'zh-TW': '克', 'zh-HK': '克' },
  kg: { en: 'kilograms', 'zh-TW': '公斤', 'zh-HK': '公斤' },
  ml: { en: 'milliliters', 'zh-TW': '毫升', 'zh-HK': '毫升' },
  l: { en: 'liters', 'zh-TW': '公升', 'zh-HK': '公升' },
  cup: { en: 'cup', 'zh-TW': '杯', 'zh-HK': '杯' },
  tbsp: { en: 'tablespoon', 'zh-TW': '湯匙', 'zh-HK': '湯匙' },
  tsp: { en: 'teaspoon', 'zh-TW': '茶匙', 'zh-HK': '茶匙' },
  piece: { en: 'piece', 'zh-TW': '個', 'zh-HK': '個' },
  slice: { en: 'slice', 'zh-TW': '片', 'zh-HK': '片' },
  bowl: { en: 'bowl', 'zh-TW': '碗', 'zh-HK': '碗' },
  plate: { en: 'plate', 'zh-TW': '盤', 'zh-HK': '盤' },
  serving: { en: 'serving', 'zh-TW': '份', 'zh-HK': '份' }
} as const;

// Risk levels for foods
export const RISK_LEVELS = {
  low: {
    en: 'Low Risk',
    'zh-TW': '低風險',
    'zh-HK': '低風險',
    color: 'text-green-600 bg-green-50'
  },
  medium: {
    en: 'Medium Risk',
    'zh-TW': '中風險',
    'zh-HK': '中風險',
    color: 'text-amber-600 bg-amber-50'
  },
  high: {
    en: 'High Risk',
    'zh-TW': '高風險',
    'zh-HK': '高風險',
    color: 'text-red-600 bg-red-50'
  }
} as const;

// Common allergens (based on major allergen groups)
export const COMMON_ALLERGENS = [
  'milk',
  'eggs',
  'fish',
  'shellfish',
  'tree_nuts',
  'peanuts',
  'wheat',
  'soybeans',
  'sesame',
  'sulfites'
] as const;

// IBD/IBS trigger foods (commonly reported)
export const COMMON_TRIGGER_FOODS = [
  'spicy_foods',
  'dairy',
  'gluten',
  'high_fiber',
  'caffeine',
  'alcohol',
  'artificial_sweeteners',
  'fried_foods',
  'gas_producing_foods',
  'acidic_foods'
] as const;

// Chemotherapy dietary guidelines categories
export const CHEMO_FOOD_GUIDELINES = {
  recommended: [
    'bland_foods',
    'easy_to_digest',
    'high_protein',
    'hydrating_foods',
    'room_temperature'
  ],
  avoid: [
    'raw_foods',
    'unpasteurized',
    'strong_smells',
    'very_hot_foods',
    'very_cold_foods',
    'greasy_foods'
  ]
} as const;

// Nutritional daily recommendations (general guidelines)
export const DAILY_RECOMMENDATIONS = {
  calories: {
    adult_male: 2500,
    adult_female: 2000,
    elderly: 1800
  },
  water: {
    adult: 2000, // ml
    elderly: 1500
  },
  fiber: {
    adult_male: 38, // grams
    adult_female: 25
  },
  protein: {
    adult: 0.8 // grams per kg body weight
  }
} as const;

// Severity color mappings
export const SEVERITY_COLORS = {
  mild: 'text-green-600 bg-green-50 border-green-200',
  moderate: 'text-amber-600 bg-amber-50 border-amber-200',
  severe: 'text-red-600 bg-red-50 border-red-200'
} as const;

// Medical condition colors
export const CONDITION_COLORS = {
  ibd: 'text-blue-600 bg-blue-50',
  chemotherapy: 'text-purple-600 bg-purple-50',
  allergy: 'text-red-600 bg-red-50',
  ibs: 'text-green-600 bg-green-50',
  crohns: 'text-blue-600 bg-blue-50',
  uc: 'text-blue-600 bg-blue-50',
  celiac: 'text-orange-600 bg-orange-50',
  other: 'text-gray-600 bg-gray-50'
} as const;

// Time periods for reports
export const REPORT_PERIODS = {
  '7d': { en: 'Last 7 days', 'zh-TW': '過去 7 天', 'zh-HK': '過去 7 天' },
  '30d': { en: 'Last 30 days', 'zh-TW': '過去 30 天', 'zh-HK': '過去 30 天' },
  '90d': { en: 'Last 3 months', 'zh-TW': '過去 3 個月', 'zh-HK': '過去 3 個月' },
  '1y': { en: 'Last year', 'zh-TW': '過去 1 年', 'zh-HK': '過去 1 年' }
} as const;

// PWA installation prompt delays
export const PWA_PROMPT_DELAY = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
export const PWA_USAGE_THRESHOLD = 5; // Number of sessions before prompting