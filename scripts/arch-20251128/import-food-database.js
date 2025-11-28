#!/usr/bin/env node

/**
 * 匯入台灣食物資料庫到 Supabase
 * 批次處理並適配資料格式
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 環境變數未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 台灣食物範例資料 - 根據 1-5 分評分系統調整
const sampleFoods = [
  {
    name: '白米飯',
    name_en: 'White Rice',
    category: '主食',
    calories: 130,
    protein: 2.7,
    carbohydrates: 28.0,
    fat: 0.3,
    fiber: 0.4,
    sugar: 0.1,
    sodium: 5.0,
    medical_scores: {
      ibd_score: 5, // 極推薦
      ibs_score: 4,
      general_safety: 5
    },
    allergens: [],
    tags: ['主食', 'IBD友善', '低過敏'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '蚵仔煎',
    name_en: 'Oyster Omelet',
    category: '夜市小吃',
    calories: 230,
    protein: 7.4,
    carbohydrates: 38.3,
    fat: 7.3,
    fiber: 1.9,
    sugar: 11.5,
    sodium: 420,
    medical_scores: {
      ibd_score: 2, // 謹慎
      ibs_score: 2,
      general_safety: 2
    },
    allergens: ['shellfish', 'egg'],
    tags: ['台灣小吃', '夜市美食', '油炸'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '地瓜',
    name_en: 'Sweet Potato',
    category: '根莖類',
    calories: 86,
    protein: 1.6,
    carbohydrates: 20.1,
    fat: 0.1,
    fiber: 3.0,
    sugar: 4.2,
    sodium: 5.0,
    medical_scores: {
      ibd_score: 4, // 良好
      ibs_score: 3,
      general_safety: 4
    },
    allergens: [],
    tags: ['天然', '營養', '纖維'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '麻辣鍋',
    name_en: 'Spicy Hot Pot',
    category: '火鍋類',
    calories: 180,
    protein: 12.0,
    carbohydrates: 8.0,
    fat: 12.0,
    fiber: 2.0,
    sugar: 3.0,
    sodium: 850,
    medical_scores: {
      ibd_score: 1, // 不建議
      ibs_score: 1,
      general_safety: 1
    },
    allergens: ['chili'],
    tags: ['辛辣', '高鈉', '刺激性'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '燕麥粥',
    name_en: 'Oatmeal Porridge',
    category: '穀物',
    calories: 68,
    protein: 2.5,
    carbohydrates: 12.0,
    fat: 1.4,
    fiber: 1.7,
    sugar: 0.8,
    sodium: 5.0,
    medical_scores: {
      ibd_score: 4, // 良好
      ibs_score: 3,
      general_safety: 4
    },
    allergens: ['gluten'],
    tags: ['健康', '高纖維', '營養'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '香蕉',
    name_en: 'Banana',
    category: '水果',
    calories: 89,
    protein: 1.1,
    carbohydrates: 23.0,
    fat: 0.3,
    fiber: 2.6,
    sugar: 12.2,
    sodium: 1.0,
    medical_scores: {
      ibd_score: 5, // 極推薦
      ibs_score: 4,
      general_safety: 5
    },
    allergens: [],
    tags: ['天然', 'IBD友善', '易消化'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '雞胸肉',
    name_en: 'Chicken Breast',
    category: '肉類',
    calories: 165,
    protein: 31.0,
    carbohydrates: 0.0,
    fat: 3.6,
    fiber: 0.0,
    sugar: 0.0,
    sodium: 74.0,
    medical_scores: {
      ibd_score: 4, // 良好
      ibs_score: 4,
      general_safety: 4
    },
    allergens: [],
    tags: ['蛋白質', '低脂', '肌肉健康'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '咖啡',
    name_en: 'Coffee',
    category: '飲料',
    calories: 2,
    protein: 0.3,
    carbohydrates: 0.0,
    fat: 0.0,
    fiber: 0.0,
    sugar: 0.0,
    sodium: 5.0,
    medical_scores: {
      ibd_score: 1, // 不建議
      ibs_score: 1,
      general_safety: 2
    },
    allergens: [],
    tags: ['咖啡因', '刺激性', 'IBD風險'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '豆腐',
    name_en: 'Tofu',
    category: '豆製品',
    calories: 76,
    protein: 8.0,
    carbohydrates: 1.9,
    fat: 4.8,
    fiber: 0.3,
    sugar: 0.6,
    sodium: 7.0,
    medical_scores: {
      ibd_score: 3, // 適中
      ibs_score: 3,
      general_safety: 3
    },
    allergens: ['soy'],
    tags: ['植物蛋白', '豆製品', '素食'],
    verification_status: 'admin_approved',
    is_custom: false
  },
  {
    name: '蒸蛋',
    name_en: 'Steamed Egg',
    category: '蛋類',
    calories: 155,
    protein: 13.0,
    carbohydrates: 1.1,
    fat: 11.0,
    fiber: 0.0,
    sugar: 1.1,
    sodium: 124.0,
    medical_scores: {
      ibd_score: 5, // 極推薦
      ibs_score: 4,
      general_safety: 5
    },
    allergens: ['egg'],
    tags: ['蛋白質', '易消化', 'IBD友善'],
    verification_status: 'admin_approved',
    is_custom: false
  }
];

async function importFoods() {
  console.log('🍜 開始匯入台灣食物資料庫...\n');

  try {
    // 檢查資料庫狀態
    console.log('1️⃣ 檢查現有資料...');
    const { count } = await supabase
      .from('diet_daily_foods')
      .select('*', { count: 'exact', head: true });

    console.log(`   現有食物資料: ${count} 筆`);

    if (count > 0) {
      console.log('⚠️  資料庫已有資料，是否要清空重新匯入？(繼續執行將添加新資料)');
    }

    // 批次匯入範例資料
    console.log('\n2️⃣ 匯入範例食物資料...');

    const batchSize = 5;
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < sampleFoods.length; i += batchSize) {
      const batch = sampleFoods.slice(i, i + batchSize);

      console.log(`   正在匯入第 ${i + 1}-${Math.min(i + batchSize, sampleFoods.length)} 筆...`);

      const { data, error } = await supabase
        .from('diet_daily_foods')
        .insert(batch)
        .select();

      if (error) {
        console.error(`   ❌ 批次匯入失敗:`, error.message);
        failed += batch.length;
      } else {
        console.log(`   ✅ 成功匯入 ${data.length} 筆食物`);
        imported += data.length;
      }
    }

    console.log(`\n📊 匯入完成統計:`);
    console.log(`   ✅ 成功: ${imported} 筆`);
    console.log(`   ❌ 失敗: ${failed} 筆`);
    console.log(`   📝 總計: ${imported + failed} 筆`);

    // 驗證匯入結果
    console.log('\n3️⃣ 驗證匯入結果...');
    const { data: samples } = await supabase
      .from('diet_daily_foods')
      .select('name, name_en, category, medical_scores, verification_status')
      .limit(5);

    if (samples && samples.length > 0) {
      console.log('📋 範例資料:');
      samples.forEach((food, index) => {
        const ibdScore = food.medical_scores?.ibd_score || 'N/A';
        console.log(`   ${index + 1}. ${food.name} (${food.name_en || 'N/A'})`);
        console.log(`      分類: ${food.category}, IBD評分: ${ibdScore}, 狀態: ${food.verification_status}`);
      });
    }

    console.log('\n🎉 食物資料庫匯入完成！');

  } catch (error) {
    console.error('❌ 匯入過程發生錯誤:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  importFoods().catch(console.error);
}

module.exports = { importFoods, sampleFoods };