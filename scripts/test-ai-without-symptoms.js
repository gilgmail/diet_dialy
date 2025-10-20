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

console.log('🧪 測試：只有飲食記錄（無症狀記錄）的 AI 分析\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);

      console.log('分析結果：');
      console.log('  成功:', result.success ? '✅' : '❌');
      console.log('  方法:', result.analysis.method);
      console.log('  食物記錄:', result.analysis.totals.food_entries, '筆');
      console.log('  症狀記錄:', result.analysis.totals.symptom_entries, '筆');

      if (result.success) {
        console.log('\n✅ 測試通過！即使沒有症狀記錄，AI 仍能正常分析');

        if (result.analysis.analysis.summary) {
          console.log('\n摘要:', result.analysis.analysis.summary);
        }
      } else {
        console.log('\n❌ 測試失敗：', result.analysis.method);
      }
    } catch (e) {
      console.error('解析錯誤:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('請求錯誤:', error.message);
});

req.write(postData);
req.end();
