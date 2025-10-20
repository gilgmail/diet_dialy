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

// Load env files
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

// 本週資料：10/14 (週一) 到 10/20 (週日)
const weekPlan = [
  {
    date: '2025-10-14', // Monday
    meals: [
      {
        time: '07:30',
        meal_type: 'breakfast',
        food_name: '燕麥粥＋藍莓',
        food_category: 'whole_grains',
        calories: 320,
        nutrition: { protein: 10, carbs: 58, fat: 6, fiber: 8 },
        medical_score: 4.5,
        symptoms_after: [],
        notes: '週一開始，選擇溫和的早餐',
      },
      {
        time: '12:15',
        meal_type: 'lunch',
        food_name: '清蒸鱸魚＋糙米飯＋青菜',
        food_category: 'protein',
        calories: 550,
        nutrition: { protein: 35, carbs: 60, fat: 12, fiber: 6 },
        medical_score: 4.8,
        symptoms_after: [],
        notes: '午餐營養均衡，魚肉易消化',
      },
      {
        time: '18:45',
        meal_type: 'dinner',
        food_name: '雞肉蔬菜湯麵',
        food_category: 'protein',
        calories: 480,
        nutrition: { protein: 28, carbs: 52, fat: 15, fiber: 5 },
        medical_score: 4.3,
        symptoms_after: [{ name: 'bloating', severity: 1 }],
        notes: '晚餐稍有脹氣',
      },
    ],
  },
  {
    date: '2025-10-15', // Tuesday
    meals: [
      {
        time: '07:45',
        meal_type: 'breakfast',
        food_name: '地瓜＋水煮蛋',
        food_category: 'whole_grains',
        calories: 280,
        nutrition: { protein: 12, carbs: 45, fat: 6, fiber: 6 },
        medical_score: 4.6,
        symptoms_after: [],
        notes: '簡單營養的早餐',
      },
      {
        time: '12:30',
        meal_type: 'lunch',
        food_name: '義大利麵＋番茄醬',
        food_category: 'carbs',
        calories: 620,
        nutrition: { protein: 18, carbs: 95, fat: 18, fiber: 4 },
        medical_score: 3.2,
        symptoms_after: [{ name: 'bloating', severity: 2 }, { name: 'gas', severity: 2 }],
        notes: '午餐後明顯脹氣，麵食可能不適合',
      },
      {
        time: '19:00',
        meal_type: 'dinner',
        food_name: '山藥排骨粥',
        food_category: 'whole_grains',
        calories: 350,
        nutrition: { protein: 20, carbs: 48, fat: 8, fiber: 4 },
        medical_score: 4.4,
        symptoms_after: [{ name: 'bloating', severity: 1 }],
        notes: '選擇溫和的粥品',
      },
    ],
  },
  {
    date: '2025-10-16', // Wednesday
    meals: [
      {
        time: '08:00',
        meal_type: 'breakfast',
        food_name: '白粥＋肉鬆',
        food_category: 'whole_grains',
        calories: 260,
        nutrition: { protein: 8, carbs: 48, fat: 4, fiber: 2 },
        medical_score: 4.0,
        symptoms_after: [],
        notes: '腸胃舒適',
      },
      {
        time: '12:00',
        meal_type: 'lunch',
        food_name: '炸雞塊＋薯條＋可樂',
        food_category: 'fried',
        calories: 950,
        nutrition: { protein: 30, carbs: 110, fat: 45, fiber: 3 },
        medical_score: 1.5,
        symptoms_after: [
          { name: 'abdominal_pain', severity: 3 },
          { name: 'bloating', severity: 3 },
          { name: 'diarrhea', severity: 2 }
        ],
        notes: '⚠️ 高風險食物：油炸＋碳酸飲料，症狀明顯',
      },
      {
        time: '19:30',
        meal_type: 'dinner',
        food_name: '清湯烏龍麵',
        food_category: 'carbs',
        calories: 320,
        nutrition: { protein: 12, carbs: 58, fat: 4, fiber: 3 },
        medical_score: 3.8,
        symptoms_after: [{ name: 'bloating', severity: 1 }],
        notes: '晚餐選擇清淡，症狀緩解',
      },
    ],
  },
  {
    date: '2025-10-17', // Thursday
    meals: [
      {
        time: '07:30',
        meal_type: 'breakfast',
        food_name: '香蕉＋優格',
        food_category: 'dairy',
        calories: 220,
        nutrition: { protein: 8, carbs: 38, fat: 4, fiber: 3 },
        medical_score: 3.5,
        symptoms_after: [{ name: 'gas', severity: 2 }],
        notes: '乳製品可能造成脹氣',
      },
      {
        time: '12:20',
        meal_type: 'lunch',
        food_name: '鮭魚飯糰＋味噌湯',
        food_category: 'protein',
        calories: 480,
        nutrition: { protein: 25, carbs: 62, fat: 14, fiber: 4 },
        medical_score: 4.2,
        symptoms_after: [],
        notes: '午餐良好',
      },
      {
        time: '18:30',
        meal_type: 'dinner',
        food_name: '蒸蛋＋青菜豆腐湯',
        food_category: 'protein',
        calories: 280,
        nutrition: { protein: 18, carbs: 12, fat: 16, fiber: 3 },
        medical_score: 4.7,
        symptoms_after: [],
        notes: '晚餐溫和，腸胃舒適',
      },
    ],
  },
  {
    date: '2025-10-18', // Friday
    meals: [
      {
        time: '08:15',
        meal_type: 'breakfast',
        food_name: '全麥土司＋酪梨',
        food_category: 'whole_grains',
        calories: 320,
        nutrition: { protein: 10, carbs: 42, fat: 14, fiber: 8 },
        medical_score: 4.4,
        symptoms_after: [],
        notes: '營養豐富的早餐',
      },
      {
        time: '12:45',
        meal_type: 'lunch',
        food_name: '咖哩飯',
        food_category: 'carbs',
        calories: 680,
        nutrition: { protein: 22, carbs: 95, fat: 22, fiber: 5 },
        medical_score: 2.8,
        symptoms_after: [
          { name: 'abdominal_pain', severity: 2 },
          { name: 'diarrhea', severity: 2 }
        ],
        notes: '⚠️ 辛香料刺激腸胃',
      },
      {
        time: '19:15',
        meal_type: 'dinner',
        food_name: '蒸雞胸肉＋花椰菜',
        food_category: 'protein',
        calories: 350,
        nutrition: { protein: 42, carbs: 18, fat: 8, fiber: 6 },
        medical_score: 4.8,
        symptoms_after: [],
        notes: '清淡晚餐，症狀改善',
      },
    ],
  },
  {
    date: '2025-10-19', // Saturday
    meals: [
      {
        time: '09:00',
        meal_type: 'breakfast',
        food_name: '法式吐司＋楓糖',
        food_category: 'carbs',
        calories: 420,
        nutrition: { protein: 12, carbs: 68, fat: 12, fiber: 2 },
        medical_score: 3.0,
        symptoms_after: [{ name: 'bloating', severity: 2 }],
        notes: '週末早午餐，糖分較高',
      },
      {
        time: '13:30',
        meal_type: 'lunch',
        food_name: '牛肉麵',
        food_category: 'protein',
        calories: 720,
        nutrition: { protein: 35, carbs: 88, fat: 24, fiber: 4 },
        medical_score: 3.3,
        symptoms_after: [{ name: 'bloating', severity: 2 }, { name: 'fatigue', severity: 1 }],
        notes: '份量較大，腸胃負擔',
      },
      {
        time: '19:45',
        meal_type: 'dinner',
        food_name: '蔬菜沙拉＋水煮鮪魚',
        food_category: 'protein',
        calories: 320,
        nutrition: { protein: 28, carbs: 15, fat: 16, fiber: 8 },
        medical_score: 4.6,
        symptoms_after: [],
        notes: '晚餐清淡，腸胃舒適',
      },
    ],
  },
  {
    date: '2025-10-20', // Sunday (今天)
    meals: [
      {
        time: '08:30',
        meal_type: 'breakfast',
        food_name: '南瓜粥＋堅果',
        food_category: 'whole_grains',
        calories: 340,
        nutrition: { protein: 12, carbs: 52, fat: 10, fiber: 7 },
        medical_score: 4.5,
        symptoms_after: [],
        notes: '週日早晨，溫和開始',
      },
      {
        time: '12:30',
        meal_type: 'lunch',
        food_name: '照燒雞腿飯＋涼拌小黃瓜',
        food_category: 'protein',
        calories: 580,
        nutrition: { protein: 32, carbs: 68, fat: 18, fiber: 4 },
        medical_score: 4.0,
        symptoms_after: [{ name: 'bloating', severity: 1 }],
        notes: '午餐正常',
      },
    ],
  },
]

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Target user ID: ${targetUserId}\n`)

  let totalInserted = 0

  for (const day of weekPlan) {
    console.log(`\n📅 處理日期: ${day.date}`)

    for (const meal of day.meals) {
      // Create consumed_at timestamp
      const consumedAt = new Date(`${day.date}T${meal.time}:00+08:00`).toISOString()

      const entryData = {
        user_id: targetUserId,
        food_name: meal.food_name,
        food_category: meal.food_category,
        meal_type: meal.meal_type,
        calories: meal.calories,
        nutrition_data: meal.nutrition,
        medical_score: meal.medical_score,
        medical_analysis: {
          symptoms_after: meal.symptoms_after,
        },
        consumed_at: consumedAt,
        notes: meal.notes,
        sync_status: 'synced',
      }

      const { data, error } = await supabase
        .from('food_entries')
        .insert(entryData)
        .select()

      if (error) {
        console.error(`  ❌ 插入失敗 (${meal.food_name}):`, error.message)
      } else {
        totalInserted++
        console.log(`  ✅ ${meal.meal_type.padEnd(10)} ${meal.time} - ${meal.food_name}`)
      }
    }
  }

  console.log(`\n\n✨ 完成！共插入 ${totalInserted} 筆本週食物記錄 (10/14-10/20)\n`)
}

main().catch(console.error)
