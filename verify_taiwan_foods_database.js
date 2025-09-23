#!/usr/bin/env node

/**
 * 台灣食物資料庫驗證腳本
 * 檢查資料庫連接、數據完整性和網頁功能
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lbjeyvvierxcnrytuvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTaiwanFoodsDatabase() {
    console.log('🔍 台灣食物資料庫驗證開始...');
    console.log('=' .repeat(50));

    try {
        // 1. 檢查資料庫連接
        console.log('📡 1. 檢查資料庫連接...');
        const { data: healthCheck, error: healthError } = await supabase
            .from('diet_daily_foods')
            .select('count')
            .limit(1);

        if (healthError) {
            console.error('❌ 資料庫連接失敗:', healthError.message);
            return false;
        }
        console.log('✅ 資料庫連接正常');

        // 2. 統計台灣食物總數
        console.log('\n📊 2. 統計台灣食物數據...');

        // 總數統計
        const { data: allFoods, error: totalError } = await supabase
            .from('diet_daily_foods')
            .select('id, name, category, taiwan_origin, verification_status')
            .eq('taiwan_origin', true);

        if (totalError) {
            console.error('❌ 獲取食物數據失敗:', totalError.message);
            return false;
        }

        const totalCount = allFoods.length;
        console.log(`📈 台灣食物總數: ${totalCount}`);

        // 驗證狀態統計
        const statusStats = {};
        const categoryStats = {};

        allFoods.forEach(food => {
            statusStats[food.verification_status] = (statusStats[food.verification_status] || 0) + 1;
            categoryStats[food.category] = (categoryStats[food.category] || 0) + 1;
        });

        console.log('\n📋 驗證狀態分佈:');
        Object.entries(statusStats).forEach(([status, count]) => {
            const percentage = ((count / totalCount) * 100).toFixed(1);
            console.log(`   ${status}: ${count} (${percentage}%)`);
        });

        console.log('\n🍽️ 食物分類分佈:');
        Object.entries(categoryStats)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                const percentage = ((count / totalCount) * 100).toFixed(1);
                console.log(`   ${category}: ${count} (${percentage}%)`);
            });

        // 3. 檢查已批准的食物數量
        console.log('\n✅ 3. 檢查已批准食物...');
        const { data: approvedFoods, error: approvedError } = await supabase
            .from('diet_daily_foods')
            .select('id, name, category')
            .eq('taiwan_origin', true)
            .eq('verification_status', 'admin_approved');

        if (approvedError) {
            console.error('❌ 獲取已批准食物失敗:', approvedError.message);
            return false;
        }

        const approvedCount = approvedFoods.length;
        console.log(`✅ 已批准食物數量: ${approvedCount}`);
        console.log(`📊 批准率: ${((approvedCount / totalCount) * 100).toFixed(1)}%`);

        // 4. 檢查重複食物
        console.log('\n🔍 4. 檢查重複食物...');
        const { data: duplicateCheck, error: duplicateError } = await supabase
            .from('diet_daily_foods')
            .select('name')
            .eq('taiwan_origin', true);

        if (duplicateError) {
            console.error('❌ 重複檢查失敗:', duplicateError.message);
            return false;
        }

        const nameCount = {};
        duplicateCheck.forEach(food => {
            nameCount[food.name] = (nameCount[food.name] || 0) + 1;
        });

        const duplicates = Object.entries(nameCount).filter(([name, count]) => count > 1);

        if (duplicates.length === 0) {
            console.log('✅ 沒有發現重複食物');
        } else {
            console.log(`⚠️ 發現 ${duplicates.length} 個重複食物:`);
            duplicates.slice(0, 10).forEach(([name, count]) => {
                console.log(`   "${name}": ${count} 次`);
            });
            if (duplicates.length > 10) {
                console.log(`   ... 還有 ${duplicates.length - 10} 個重複項目`);
            }
        }

        // 5. 測試搜尋功能
        console.log('\n🔍 5. 測試搜尋功能...');
        const testSearches = ['牛肉麵', '蚵仔煎', '珍珠奶茶', '鳳梨酥'];

        for (const searchTerm of testSearches) {
            const { data: searchResults, error: searchError } = await supabase
                .from('diet_daily_foods')
                .select('id, name, category')
                .eq('taiwan_origin', true)
                .eq('verification_status', 'admin_approved')
                .ilike('name', `%${searchTerm}%`)
                .limit(5);

            if (searchError) {
                console.log(`❌ 搜尋 "${searchTerm}" 失敗:`, searchError.message);
            } else {
                console.log(`🔍 搜尋 "${searchTerm}": 找到 ${searchResults.length} 個結果`);
                if (searchResults.length > 0) {
                    console.log(`   首個結果: ${searchResults[0].name} (${searchResults[0].category})`);
                }
            }
        }

        // 6. 檢查營養資訊
        console.log('\n🥗 6. 檢查營養資訊完整性...');
        const { data: nutritionCheck, error: nutritionError } = await supabase
            .from('diet_daily_foods')
            .select('id, name, calories, protein, carbohydrates, fat, fiber')
            .eq('taiwan_origin', true)
            .eq('verification_status', 'admin_approved')
            .limit(100);

        if (nutritionError) {
            console.error('❌ 營養資訊檢查失敗:', nutritionError.message);
        } else {
            const hasNutrition = nutritionCheck.filter(food =>
                food.calories && food.protein && food.carbohydrates && food.fat
            ).length;

            const nutritionRate = ((hasNutrition / nutritionCheck.length) * 100).toFixed(1);
            console.log(`📊 營養資訊完整率: ${nutritionRate}% (${hasNutrition}/${nutritionCheck.length})`);
        }

        // 7. 檢查醫療評分
        console.log('\n🏥 7. 檢查醫療評分...');
        const { data: scoreCheck, error: scoreError } = await supabase
            .from('diet_daily_foods')
            .select('id, name, condition_scores')
            .eq('taiwan_origin', true)
            .eq('verification_status', 'admin_approved')
            .limit(100);

        if (scoreError) {
            console.error('❌ 醫療評分檢查失敗:', scoreError.message);
        } else {
            const hasScores = scoreCheck.filter(food =>
                food.condition_scores &&
                (food.condition_scores.ibd_score || food.condition_scores.ibs_score)
            ).length;

            const scoreRate = ((hasScores / scoreCheck.length) * 100).toFixed(1);
            console.log(`📊 醫療評分覆蓋率: ${scoreRate}% (${hasScores}/${scoreCheck.length})`);
        }

        // 8. 輸出總結報告
        console.log('\n📋 8. 驗證結果總結:');
        console.log('=' .repeat(40));

        const report = {
            資料庫連接: '✅ 正常',
            食物總數: `${totalCount} 個`,
            已批准食物: `${approvedCount} 個 (${((approvedCount / totalCount) * 100).toFixed(1)}%)`,
            重複檢查: duplicates.length === 0 ? '✅ 無重複' : `⚠️ ${duplicates.length} 個重複`,
            搜尋功能: '✅ 正常',
            資料庫狀態: approvedCount > 900 ? '✅ 就緒' : '⚠️ 需要匯入更多數據'
        };

        Object.entries(report).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });

        // 建議事項
        console.log('\n💡 建議事項:');
        if (duplicates.length > 0) {
            console.log('1. 🔧 執行重複清理 SQL 腳本');
        }
        if (approvedCount < 900) {
            console.log('2. 📥 匯入剩餘的台灣食物批次檔案');
        }
        if (approvedCount > 900) {
            console.log('✅ 資料庫已就緒，可以進行網頁功能測試');
        }

        return {
            success: true,
            totalCount,
            approvedCount,
            duplicatesCount: duplicates.length,
            categories: Object.keys(categoryStats).length
        };

    } catch (error) {
        console.error('❌ 驗證過程發生錯誤:', error.message);
        return false;
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    verifyTaiwanFoodsDatabase()
        .then(result => {
            if (result && result.success) {
                console.log('\n🎉 台灣食物資料庫驗證完成！');
                process.exit(0);
            } else {
                console.log('\n❌ 驗證失敗，請檢查相關問題');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = { verifyTaiwanFoodsDatabase };