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

const loaded = [loadEnvFile('.env.local'), loadEnvFile('.env')]

if (!loaded.some(Boolean)) {
  console.warn('⚠️  No .env files found.')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const targetUserId = process.argv[2] || '22e990b6-a888-4beb-9ac6-c9a145731542'

// 本週症狀記錄（對應食物記錄的症狀）
const weekSymptoms = [
  {
    date: '2025-10-14',
    overall_health: 4,
    abdominal_pain: 1,
    diarrhea: 0,
    bloody_stool: 0,
    bloating: 1,
    bowel_movement_count: 1,
    stool_type: 4, // Bristol stool scale
    mood_score: 4,
    energy_level: 4,
    sleep_quality: 4,
    stress_level: 2,
    notes: '週一狀況良好，飲食溫和',
  },
  {
    date: '2025-10-15',
    overall_health: 3,
    abdominal_pain: 2,
    diarrhea: 1,
    bloody_stool: 0,
    bloating: 3,
    bowel_movement_count: 2,
    stool_type: 5,
    mood_score: 3,
    energy_level: 3,
    sleep_quality: 3,
    stress_level: 3,
    notes: '義大利麵後明顯脹氣和腹瀉，需避免麵食',
  },
  {
    date: '2025-10-16',
    overall_health: 2,
    abdominal_pain: 4,
    diarrhea: 3,
    bloody_stool: 0,
    bloating: 4,
    bowel_movement_count: 4,
    stool_type: 5,
    mood_score: 2,
    energy_level: 2,
    sleep_quality: 2,
    stress_level: 4,
    notes: '⚠️ 炸雞＋可樂引發嚴重症狀，腹痛、腹瀉、脹氣',
  },
  {
    date: '2025-10-17',
    overall_health: 3,
    abdominal_pain: 2,
    diarrhea: 1,
    bloody_stool: 0,
    bloating: 2,
    bowel_movement_count: 2,
    stool_type: 5,
    mood_score: 3,
    energy_level: 3,
    sleep_quality: 3,
    stress_level: 3,
    notes: '優格造成輕微脹氣，乳製品需注意',
  },
  {
    date: '2025-10-18',
    overall_health: 3,
    abdominal_pain: 3,
    diarrhea: 2,
    bloody_stool: 0,
    bloating: 2,
    bowel_movement_count: 3,
    stool_type: 5,
    mood_score: 3,
    energy_level: 2,
    sleep_quality: 3,
    stress_level: 3,
    notes: '咖哩飯引發腹痛和腹瀉，辛香料刺激腸道',
  },
  {
    date: '2025-10-19',
    overall_health: 3,
    abdominal_pain: 2,
    diarrhea: 1,
    bloody_stool: 0,
    bloating: 3,
    bowel_movement_count: 2,
    stool_type: 5,
    mood_score: 3,
    energy_level: 3,
    sleep_quality: 4,
    stress_level: 2,
    notes: '週末飲食份量較大，有輕微不適',
  },
  {
    date: '2025-10-20',
    overall_health: 4,
    abdominal_pain: 1,
    diarrhea: 0,
    bloody_stool: 0,
    bloating: 1,
    bowel_movement_count: 1,
    stool_type: 4,
    mood_score: 4,
    energy_level: 4,
    sleep_quality: 4,
    stress_level: 2,
    notes: '週日選擇溫和食物，症狀改善',
  },
]

async function main() {
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log(`Target user ID: ${targetUserId}\n`)

  let totalInserted = 0

  for (const symptom of weekSymptoms) {
    const recordedAt = new Date(`${symptom.date}T20:00:00+08:00`).toISOString()

    const entryData = {
      user_id: targetUserId,
      recorded_date: symptom.date,
      recorded_at: recordedAt,
      overall_health: symptom.overall_health,
      abdominal_pain: symptom.abdominal_pain,
      diarrhea: symptom.diarrhea,
      bloody_stool: symptom.bloody_stool,
      bloating: symptom.bloating,
      bowel_movement_count: symptom.bowel_movement_count,
      stool_type: symptom.stool_type,
      mood_score: symptom.mood_score,
      energy_level: symptom.energy_level,
      sleep_quality: symptom.sleep_quality,
      stress_level: symptom.stress_level,
      notes: symptom.notes,
      additional_symptoms: [],
      related_food_entries: [],
      medications_taken: [],
      triggers_identified: [],
      improvement_factors: [],
      entry_source: 'manual',
      data_completeness_score: 0.95,
    }

    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .insert(entryData)
      .select()

    if (error) {
      console.error(`  ❌ 插入失敗 (${symptom.date}):`, error.message)
    } else {
      totalInserted++
      console.log(
        `  ✅ ${symptom.date} - 整體健康: ${symptom.overall_health}/5, 症狀: 腹痛${symptom.abdominal_pain} 腹瀉${symptom.diarrhea} 脹氣${symptom.bloating}`
      )
    }
  }

  console.log(`\n\n✨ 完成！共插入 ${totalInserted} 筆本週症狀記錄 (10/14-10/20)\n`)
}

main().catch(console.error)
