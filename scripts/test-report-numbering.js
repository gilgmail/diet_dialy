#!/usr/bin/env node

const http = require('http');

function makeRequest(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/weekly-ibd-analysis',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const postData = JSON.stringify({
      userId: '22e990b6-a888-4beb-9ac6-c9a145731542',
      startDate,
      endDate,
    });

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('📊 測試 AI 週報編號功能\n');

  // Test 1: Successful analysis
  console.log('測試 1: 生成新報告（有足夠資料）');
  console.log('  期間: 2025-10-14 ~ 2025-10-20\n');

  try {
    const result = await makeRequest('2025-10-14', '2025-10-20');

    if (result.success) {
      console.log('✅ 成功生成報告！\n');

      if (result.reportInfo) {
        console.log('📋 報告資訊:');
        console.log('  ', result.reportInfo.message);
        console.log('   日期範圍:', result.reportInfo.dateRange);
        console.log('   報告編號:', `#${result.reportInfo.reportNumber}`);
        console.log('   總報告數:', result.reportInfo.totalReports);
      }

      console.log('\n📚 歷史報告:');
      result.history.slice(0, 5).forEach((report) => {
        console.log(`   #${report.reportNumber} - ${report.title}`);
        console.log(`        日期: ${report.createdAt.split('T')[0]}`);
      });
    } else {
      console.log('❌ 分析失敗');
      if (result.error) {
        console.log('   ', result.error);
      }
    }
  } catch (error) {
    console.error('請求失敗:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Insufficient data
  console.log('測試 2: 資料不足的情況');
  console.log('  期間: 2025-11-01 ~ 2025-11-07（沒有資料）\n');

  try {
    const result = await makeRequest('2025-11-01', '2025-11-07');

    if (result.success) {
      console.log('✅ 報告生成成功（預期應該失敗）');
    } else {
      console.log('❌ 分析失敗（符合預期）');
      if (result.error) {
        console.log('   ', result.error);
      }
      console.log('\n   分析方法:', result.analysis.method);
      console.log('   食物記錄:', result.analysis.totals.food_entries, '筆');
      console.log('   症狀記錄:', result.analysis.totals.symptom_entries, '筆');
    }
  } catch (error) {
    console.error('請求失敗:', error.message);
  }

  console.log('\n✨ 測試完成！\n');
}

main().catch(console.error);
