#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

function loadEnvFile(fileName) {
  const fullPath = path.resolve(process.cwd(), fileName)
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath })
    return true
  }
  return false
}

// Load env files in priority order so service keys are available when running locally
const loaded = [
  loadEnvFile('.env.local'),
  loadEnvFile('.env'),
]

if (!loaded.some(Boolean)) {
  console.warn('⚠️  No .env files found. Relying on existing environment variables.')
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Ensure SUPABASE_SERVICE_ROLE_KEY and URL env vars are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
})

const targetUserId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542'

const weekPlan = [
  {
    date: '2025-10-06',
    meals: [
      {
        time: '07:45',
        meal_type: 'breakfast',
        food_name: '地瓜粥＋溫水',
        food_category: 'whole_grains',
        calories: 280,
        nutrition: { protein: 8, carbs: 56, fat: 2, fiber: 6 },
        medical_score: 4.2,
        symptoms_after: [{ name: 'bloating', severity: 1 }],
        notes: '腸胃狀況佳，當日行程輕鬆',
      },
      {
        time: '12:30',
        meal_type: 'lunch',
        food_name: '清蒸鱸魚＋糙米飯',
        food_category: 'lean_protein',
        calories: 540,
        nutrition: { protein: 40, carbs: 48, fat: 12, fiber: 5 },
        medical_score: 4.6,
        symptoms_after: [{ name: 'overall_health', severity: 4 }],
        notes: '飯後散步 20 分鐘',
      },
      {
        time: '18:45',
        meal_type: 'dinner',
        food_name: '味增豆腐湯＋蒸南瓜',
        food_category: 'balanced',
        calories: 420,
        nutrition: { protein: 22, carbs: 52, fat: 10, fiber: 7 },
        medical_score: 4.4,
        symptoms_after: [{ name: 'overall_health', severity: 4 }],
        notes: '無特殊不適',
      },
    ],
  },
  {
    date: '2025-10-07',
    meals: [
      {
        time: '08:00',
        meal_type: 'breakfast',
        food_name: '燕麥豆奶優格',
        food_category: 'breakfast',
        calories: 310,
        nutrition: { protein: 16, carbs: 42, fat: 8, fiber: 6 },
        medical_score: 4.0,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '加亞麻籽與藍莓',
      },
      {
        time: '13:10',
        meal_type: 'lunch',
        food_name: '雞胸肉沙拉＋藜麥',
        food_category: 'lean_protein',
        calories: 480,
        nutrition: { protein: 38, carbs: 46, fat: 14, fiber: 8 },
        medical_score: 4.3,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '工作壓力較高，進食較快',
      },
      {
        time: '19:30',
        meal_type: 'dinner',
        food_name: '牛肉湯麵（清湯）',
        food_category: 'comfort',
        calories: 560,
        nutrition: { protein: 32, carbs: 62, fat: 16, fiber: 3 },
        medical_score: 3.5,
        symptoms_after: [{ name: 'abdominal_pain', severity: 2 }],
        notes: '稍微感到腹部緊繃',
      },
      {
        time: '21:15',
        meal_type: 'snack',
        food_name: '洋甘菊茶',
        food_category: 'beverage',
        calories: 5,
        nutrition: { carbs: 1 },
        medical_score: 4.8,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '睡前放鬆',
      },
    ],
  },
  {
    date: '2025-10-08',
    meals: [
      {
        time: '07:30',
        meal_type: 'breakfast',
        food_name: '溫豆漿＋芝麻豆腐',
        food_category: 'plant_protein',
        calories: 320,
        nutrition: { protein: 20, carbs: 30, fat: 12, fiber: 4 },
        medical_score: 4.2,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '睡眠品質佳',
      },
      {
        time: '12:50',
        meal_type: 'lunch',
        food_name: '番茄海鮮粥',
        food_category: 'seafood',
        calories: 510,
        nutrition: { protein: 34, carbs: 58, fat: 14, fiber: 5 },
        medical_score: 4.1,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '餐後有短暫倦怠感',
      },
      {
        time: '18:20',
        meal_type: 'dinner',
        food_name: '泰式椰奶雞（減辣）',
        food_category: 'rich',
        calories: 640,
        nutrition: { protein: 36, carbs: 48, fat: 28, fiber: 4 },
        medical_score: 3.2,
        symptoms_after: [{ name: 'diarrhea', severity: 3 }],
        notes: '稍微感到腸胃不適',
      },
    ],
  },
  {
    date: '2025-10-09',
    meals: [
      {
        time: '08:15',
        meal_type: 'breakfast',
        food_name: '芝麻糊＋全麥吐司',
        food_category: 'breakfast',
        calories: 360,
        nutrition: { protein: 14, carbs: 48, fat: 12, fiber: 6 },
        medical_score: 3.8,
        symptoms_after: [{ name: 'bloating', severity: 2 }],
        notes: '晨間稍有脹氣',
      },
      {
        time: '12:10',
        meal_type: 'lunch',
        food_name: '紅燒牛腩飯',
        food_category: 'comfort',
        calories: 720,
        nutrition: { protein: 38, carbs: 80, fat: 24, fiber: 5 },
        medical_score: 3.0,
        symptoms_after: [{ name: 'abdominal_pain', severity: 3 }],
        notes: '午後工作會議壓力大',
      },
      {
        time: '19:00',
        meal_type: 'dinner',
        food_name: '清炒時蔬＋蒸雞腿',
        food_category: 'balanced',
        calories: 500,
        nutrition: { protein: 35, carbs: 42, fat: 16, fiber: 9 },
        medical_score: 4.1,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '晚餐後步行 30 分鐘',
      },
    ],
  },
  {
    date: '2025-10-10',
    meals: [
      {
        time: '07:50',
        meal_type: 'breakfast',
        food_name: '山藥排骨粥',
        food_category: 'comfort',
        calories: 330,
        nutrition: { protein: 18, carbs: 44, fat: 8, fiber: 5 },
        medical_score: 4.3,
        symptoms_after: [{ name: 'overall_health', severity: 4 }],
        notes: '精神狀態佳',
      },
      {
        time: '12:40',
        meal_type: 'lunch',
        food_name: '鮭魚便當＋溫蔬菜',
        food_category: 'seafood',
        calories: 610,
        nutrition: { protein: 42, carbs: 54, fat: 20, fiber: 6 },
        medical_score: 4.5,
        symptoms_after: [{ name: 'overall_health', severity: 4 }],
        notes: '無不適',
      },
      {
        time: '18:10',
        meal_type: 'dinner',
        food_name: '牛奶火鍋（低脂）',
        food_category: 'rich',
        calories: 680,
        nutrition: { protein: 32, carbs: 50, fat: 28, fiber: 7 },
        medical_score: 3.4,
        symptoms_after: [{ name: 'bloating', severity: 3 }],
        notes: '稍微腹脹',
      },
    ],
  },
  {
    date: '2025-10-11',
    meals: [
      {
        time: '09:10',
        meal_type: 'breakfast',
        food_name: '水果優格碗',
        food_category: 'breakfast',
        calories: 290,
        nutrition: { protein: 12, carbs: 46, fat: 8, fiber: 5 },
        medical_score: 4.0,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '週末起床較晚',
      },
      {
        time: '13:30',
        meal_type: 'lunch',
        food_name: '泰式酸辣湯＋白飯',
        food_category: 'spicy',
        calories: 570,
        nutrition: { protein: 28, carbs: 62, fat: 18, fiber: 4 },
        medical_score: 3.1,
        symptoms_after: [{ name: 'diarrhea', severity: 3 }],
        notes: '辣度較高，立即感到腸胃不適',
      },
      {
        time: '20:00',
        meal_type: 'dinner',
        food_name: '蒸鱈魚＋菠菜糙米飯',
        food_category: 'lean_protein',
        calories: 520,
        nutrition: { protein: 38, carbs: 48, fat: 12, fiber: 8 },
        medical_score: 4.4,
        symptoms_after: [{ name: 'overall_health', severity: 3 }],
        notes: '有感舒緩',
      },
    ],
  },
  {
    date: '2025-10-12',
    meals: [
      {
        time: '08:20',
        meal_type: 'breakfast',
        food_name: '白吐司＋花生醬',
        food_category: 'processed',
        calories: 350,
        nutrition: { protein: 12, carbs: 42, fat: 14, fiber: 3 },
        medical_score: 2.8,
        symptoms_after: [{ name: 'bloating', severity: 3 }],
        notes: '早餐較重口味',
      },
      {
        time: '12:15',
        meal_type: 'lunch',
        food_name: '滷肉飯＋奶茶',
        food_category: 'high_fat',
        calories: 780,
        nutrition: { protein: 28, carbs: 88, fat: 32, fiber: 4 },
        medical_score: 2.4,
        symptoms_after: [
          { name: 'abdominal_pain', severity: 4 },
          { name: 'diarrhea', severity: 4 },
        ],
        notes: '午餐後明顯不適，下午休息',
      },
      {
        time: '19:10',
        meal_type: 'dinner',
        food_name: '地瓜雞胸沙拉',
        food_category: 'balanced',
        calories: 430,
        nutrition: { protein: 34, carbs: 38, fat: 10, fiber: 7 },
        medical_score: 4.2,
        symptoms_after: [{ name: 'overall_health', severity: 2 }],
        notes: '晚餐走清淡路線',
      },
    ],
  },
]

function toPayload({ date, meals }) {
  return meals.map((meal, index) => {
    const consumedAt = new Date(`${date}T${meal.time}:00+08:00`)
    return {
      user_id: targetUserId,
      food_id: null,
      food_name: meal.food_name,
      food_category: meal.food_category,
      amount: 100,
      unit: 'g',
      calories: meal.calories,
      nutrition_data: meal.nutrition || {},
      medical_score: meal.medical_score,
      medical_analysis: {},
      consumed_at: consumedAt.toISOString(),
      meal_type: meal.meal_type,
      symptoms_before: [],
      symptoms_after: meal.symptoms_after || [],
      symptom_severity: meal.symptoms_after?.reduce((max, s) => Math.max(max, Number(s.severity) || 0), 0) || null,
      notes: meal.notes,
      photo_url: null,
      location: 'Home',
      sync_status: 'synced',
      created_at: consumedAt.toISOString(),
      updated_at: consumedAt.toISOString(),
    }
  })
}

async function main() {
  try {
    console.log(`Seeding weekly food entries for user: ${targetUserId}`)

    const payload = weekPlan.flatMap(toPayload)
    const startDateIso = `${weekPlan[0].date}T00:00:00+08:00`
    const endDateIso = `${weekPlan[weekPlan.length - 1].date}T23:59:59+08:00`

    const { error: deleteError } = await supabase
      .from('food_entries')
      .delete()
      .eq('user_id', targetUserId)
      .gte('consumed_at', startDateIso)
      .lte('consumed_at', endDateIso)

    if (deleteError && deleteError.code !== 'PGRST116') {
      throw deleteError
    }

    const { error } = await supabase.from('food_entries').insert(payload)

    if (error) {
      throw error
    }

    console.log(`✅ Inserted ${payload.length} food entries across ${weekPlan.length} days.`)
  } catch (error) {
    console.error('❌ Failed to seed weekly food entries:', error)
    process.exit(1)
  }
}

main()
