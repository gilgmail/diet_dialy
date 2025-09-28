#!/usr/bin/env node

/**
 * 測試食物搜尋 API
 */

const axios = require('axios');

const baseUrl = 'http://localhost:3000';

async function testFoodSearch() {
  console.log('🔍 測試食物搜尋功能...\n');

  const tests = [
    {
      name: '搜尋白米',
      url: `${baseUrl}/api/foods/enhanced-search?query=白米&limit=3`,
    },
    {
      name: '搜尋 rice (英文)',
      url: `${baseUrl}/api/foods/enhanced-search?query=rice&limit=3`,
    },
    {
      name: '搜尋主食分類',
      url: `${baseUrl}/api/foods/enhanced-search?category=主食&limit=5`,
    },
    {
      name: '安全等級篩選 (>=4分)',
      url: `${baseUrl}/api/foods/enhanced-search?safetyLevel=4&limit=5`,
    },
    {
      name: '包含營養資訊',
      url: `${baseUrl}/api/foods/enhanced-search?query=雞&includeNutrition=true&limit=2`,
    },
    {
      name: '列出所有食物 (前10筆)',
      url: `${baseUrl}/api/foods/enhanced-search?limit=10`,
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🧪 ${test.name}...`);

      const response = await axios.get(test.url, { timeout: 10000 });
      const data = response.data;

      if (data.success) {
        console.log(`   ✅ 成功: 找到 ${data.total_count} 筆結果`);
        console.log(`   ⏱️  搜尋時間: ${data.search_metadata.search_time_ms}ms`);
        console.log(`   🏷️  套用篩選: ${data.search_metadata.filters_applied.join(', ')}`);

        if (data.results && data.results.length > 0) {
          console.log('   📋 範例結果:');
          data.results.slice(0, 2).forEach((food, index) => {
            console.log(`      ${index + 1}. ${food.name} (${food.name_en || 'N/A'})`);
            console.log(`         分類: ${food.category}, 評分: ${food.medical_score || 'N/A'}, 安全等級: ${food.safety_level || 'N/A'}`);
            if (food.calories) {
              console.log(`         營養: ${food.calories} kcal, 蛋白質: ${food.protein || 'N/A'}g`);
            }
          });
        }
      } else {
        console.log(`   ❌ API 回應失敗: ${data.error || 'Unknown error'}`);
      }

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log(`   ⏰ 超時: 請求超過10秒`);
      } else {
        console.log(`   ❌ 錯誤: ${error.message}`);
      }
    }

    console.log(''); // 空行分隔
  }

  console.log('🎉 測試完成！');
}

// 安裝 axios 如果沒有的話
if (require.main === module) {
  testFoodSearch().catch(error => {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('axios')) {
      console.log('❌ 請先安裝 axios: npm install axios --legacy-peer-deps');
    } else {
      console.error('❌ 測試失敗:', error.message);
    }
  });
}

module.exports = { testFoodSearch };