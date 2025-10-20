const http = require('http');

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
  startDate: '2025-10-14',
  endDate: '2025-10-20',
});

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const analysis = JSON.parse(result.analysis.raw_ai_response);

      console.log('✅ AI 週報分析成功！\n');
      console.log('📊 資料統計:');
      console.log('  食物記錄:', result.analysis.totals.food_entries, '筆');
      console.log('  症狀記錄:', result.analysis.totals.symptom_entries, '筆');
      console.log('  分析期間:', result.analysis.timeframe.startDate, '~', result.analysis.timeframe.endDate);

      console.log('\n📝 分析摘要:');
      console.log(' ', analysis.summary);

      console.log('\n⚠️ 需監控的高風險食物:');
      analysis.foods_to_monitor.forEach((f, i) => {
        console.log(`  ${i + 1}. [${f.risk_level.toUpperCase()}] ${f.food}`);
        console.log(`     原因: ${f.reasoning.join(', ')}`);
        console.log(`     建議: ${f.recommended_actions.join(', ')}`);
      });

      console.log('\n✨ 有益食物:');
      analysis.supportive_foods.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.food}`);
        console.log(`     好處: ${f.benefits.join(', ')}`);
      });

      console.log('\n🔗 報告歷史:');
      console.log(`  共 ${result.history.length} 份報告已保存`);
      result.history.slice(0, 3).forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.title} (${h.createdAt.split('T')[0]})`);
      });
    } catch (e) {
      console.error('解析錯誤:', e.message);
      console.log('原始響應:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('請求錯誤:', error.message);
});

req.write(postData);
req.end();
