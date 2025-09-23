#!/usr/bin/env node

/**
 * 檢查台灣食物資料庫的實際結構和樣本數據
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFoodSchema() {
    console.log('🔍 檢查台灣食物資料庫結構...');
    console.log('=' .repeat(50));

    try {
        // 獲取幾個樣本食物來檢查結構
        const { data: sampleFoods, error } = await supabase
            .from('diet_daily_foods')
            .select('*')
            .eq('taiwan_origin', true)
            .limit(3);

        if (error) {
            console.error('❌ 獲取樣本數據失敗:', error.message);
            return;
        }

        if (sampleFoods.length === 0) {
            console.log('⚠️ 沒有找到台灣食物數據');
            return;
        }

        console.log('📋 樣本食物數據結構:');
        console.log('=' .repeat(30));

        sampleFoods.forEach((food, index) => {
            console.log(`\n🍽️ 樣本 ${index + 1}: ${food.name}`);
            console.log('─'.repeat(25));

            // 基本資訊
            console.log('基本資訊:');
            console.log(`  ID: ${food.id}`);
            console.log(`  名稱: ${food.name}`);
            console.log(`  英文名: ${food.name_en || 'N/A'}`);
            console.log(`  分類: ${food.category}`);
            console.log(`  台灣食物: ${food.taiwan_origin}`);
            console.log(`  驗證狀態: ${food.verification_status}`);

            // 營養資訊
            console.log('\n營養資訊:');
            console.log(`  熱量: ${food.calories || 'N/A'}`);
            console.log(`  蛋白質: ${food.protein || 'N/A'}g`);
            console.log(`  碳水化合物: ${food.carbohydrates || 'N/A'}g`);
            console.log(`  脂肪: ${food.fat || 'N/A'}g`);
            console.log(`  纖維: ${food.fiber || 'N/A'}g`);
            console.log(`  糖: ${food.sugar || 'N/A'}g`);
            console.log(`  鈉: ${food.sodium || 'N/A'}mg`);

            // 醫療評分 - 檢查各種可能的欄位名稱
            console.log('\n醫療評分相關:');
            console.log(`  condition_scores: ${JSON.stringify(food.condition_scores, null, 2) || 'N/A'}`);
            console.log(`  medical_scores: ${JSON.stringify(food.medical_scores, null, 2) || 'N/A'}`);
            console.log(`  medical_score: ${food.medical_score || 'N/A'}`);
            console.log(`  ibd_score: ${food.ibd_score || 'N/A'}`);
            console.log(`  ibs_score: ${food.ibs_score || 'N/A'}`);

            // 其他欄位
            console.log('\n其他屬性:');
            console.log(`  food_properties: ${JSON.stringify(food.food_properties, null, 2) || 'N/A'}`);
            console.log(`  trigger_analysis: ${JSON.stringify(food.trigger_analysis, null, 2) || 'N/A'}`);
            console.log(`  allergens: ${JSON.stringify(food.allergens, null, 2) || 'N/A'}`);
            console.log(`  tags: ${JSON.stringify(food.tags, null, 2) || 'N/A'}`);

            // 時間戳
            console.log('\n時間資訊:');
            console.log(`  創建時間: ${food.created_at}`);
            console.log(`  更新時間: ${food.updated_at || 'N/A'}`);
        });

        // 檢查所有欄位名稱
        console.log('\n📝 所有可用欄位:');
        console.log('=' .repeat(30));
        const allKeys = new Set();
        sampleFoods.forEach(food => {
            Object.keys(food).forEach(key => allKeys.add(key));
        });

        const sortedKeys = Array.from(allKeys).sort();
        sortedKeys.forEach(key => {
            console.log(`  - ${key}`);
        });

        // 檢查醫療評分的實際資料結構
        console.log('\n🔍 醫療評分詳細分析:');
        console.log('=' .repeat(30));

        const foodsWithScores = sampleFoods.filter(food =>
            food.condition_scores || food.medical_scores || food.medical_score
        );

        if (foodsWithScores.length > 0) {
            console.log('✅ 找到含有評分的食物:');
            foodsWithScores.forEach(food => {
                console.log(`\n🍽️ ${food.name}:`);
                if (food.condition_scores) {
                    console.log(`  condition_scores:`, food.condition_scores);
                }
                if (food.medical_scores) {
                    console.log(`  medical_scores:`, food.medical_scores);
                }
                if (food.medical_score) {
                    console.log(`  medical_score:`, food.medical_score);
                }
            });
        } else {
            console.log('⚠️ 樣本中沒有找到醫療評分數據');

            // 再試試查找有評分的食物
            const { data: scoredFoods, error: scoreError } = await supabase
                .from('diet_daily_foods')
                .select('name, condition_scores, medical_scores, medical_score, ibd_score, ibs_score')
                .eq('taiwan_origin', true)
                .not('condition_scores', 'is', null)
                .limit(5);

            if (!scoreError && scoredFoods.length > 0) {
                console.log('\n✅ 從資料庫找到有評分的食物:');
                scoredFoods.forEach(food => {
                    console.log(`🍽️ ${food.name}:`, food);
                });
            }
        }

    } catch (error) {
        console.error('❌ 檢查過程發生錯誤:', error.message);
    }
}

// 執行檢查
if (require.main === module) {
    checkFoodSchema()
        .then(() => {
            console.log('\n🎉 資料庫結構檢查完成！');
        })
        .catch(error => {
            console.error('腳本執行失敗:', error);
        });
}

module.exports = { checkFoodSchema };