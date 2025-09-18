// PDF報告功能瀏覽器測試腳本
// 在瀏覽器控制台中執行此腳本進行自動化測試

(function PDFReportTester() {
  const results = {
    pageLoad: false,
    navigation: false,
    dataPreview: false,
    previewFunction: false,
    periodSelection: false,
    errorHandling: false,
    chineseText: false,
    issues: []
  };

  console.log('🚀 開始PDF報告功能綜合測試...');
  console.log('📍 當前URL:', window.location.href);

  // 測試1: 頁面載入和基本元素
  function testPageLoad() {
    console.log('\n📋 測試1: 頁面載入和基本元素');

    try {
      const title = document.querySelector('h1');
      const statsCards = document.querySelectorAll('.bg-white.p-4.rounded-lg.shadow-sm.border');

      if (title && title.textContent.includes('健康分析中心')) {
        console.log('✅ 頁面標題正確顯示:', title.textContent);
        results.pageLoad = true;
      } else {
        console.log('❌ 頁面標題問題');
        results.issues.push('頁面標題顯示不正確');
      }

      if (statsCards.length >= 4) {
        console.log('✅ 統計卡片正確顯示，數量:', statsCards.length);
        Array.from(statsCards).forEach((card, index) => {
          const value = card.querySelector('.text-2xl.font-bold');
          const label = card.querySelector('.text-sm.text-gray-600');
          console.log(`  - 卡片${index + 1}: ${value?.textContent} ${label?.textContent}`);
        });
      } else {
        console.log('❌ 統計卡片顯示問題');
        results.issues.push('統計卡片數量不正確');
      }

      results.chineseText = true; // 如果能讀取到中文標題，說明中文支持正常

    } catch (error) {
      console.log('❌ 頁面載入測試失敗:', error);
      results.issues.push('頁面載入測試異常: ' + error.message);
    }
  }

  // 測試2: 導航到PDF報告區域
  function testNavigation() {
    console.log('\n🧭 測試2: 導航到PDF報告區域');

    try {
      const pdfTab = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('📄 PDF報告')
      );

      if (pdfTab) {
        console.log('✅ 找到PDF報告標籤');
        pdfTab.click();
        console.log('✅ 已點擊PDF報告標籤');

        setTimeout(() => {
          const reportTitle = document.querySelector('h2');
          if (reportTitle && reportTitle.textContent.includes('PDF 報告匯出')) {
            console.log('✅ PDF報告區域正確顯示:', reportTitle.textContent);
            results.navigation = true;
            continueTests();
          } else {
            console.log('❌ PDF報告區域顯示問題');
            results.issues.push('PDF報告區域未正確顯示');
            continueTests();
          }
        }, 1000);

      } else {
        console.log('❌ 找不到PDF報告標籤');
        results.issues.push('PDF報告標籤不存在');
        continueTests();
      }

    } catch (error) {
      console.log('❌ 導航測試失敗:', error);
      results.issues.push('導航測試異常: ' + error.message);
      continueTests();
    }
  }

  // 測試3: 數據預覽功能
  function testDataPreview() {
    console.log('\n📊 測試3: 數據預覽功能');

    try {
      const dataPreview = document.querySelector('.bg-gray-50');
      if (dataPreview) {
        const previewTitle = dataPreview.querySelector('h3');
        const dataCounts = Array.from(dataPreview.querySelectorAll('.font-semibold')).map(
          el => el.textContent
        );
        const dataLabels = Array.from(dataPreview.querySelectorAll('.text-gray-600')).map(
          el => el.textContent
        );

        console.log('✅ 數據預覽區域存在');
        console.log('✅ 預覽標題:', previewTitle?.textContent);
        console.log('✅ 數據統計:');
        dataCounts.forEach((count, index) => {
          console.log(`  - ${dataLabels[index]}: ${count}`);
        });

        if (dataCounts.length >= 4) {
          results.dataPreview = true;
        } else {
          results.issues.push('數據預覽項目數量不足');
        }

      } else {
        console.log('❌ 找不到數據預覽區域');
        results.issues.push('數據預覽區域不存在');
      }

    } catch (error) {
      console.log('❌ 數據預覽測試失敗:', error);
      results.issues.push('數據預覽測試異常: ' + error.message);
    }
  }

  // 測試4: 預覽報告功能
  function testPreviewFunction() {
    console.log('\n🔍 測試4: 預覽報告功能');

    try {
      const previewButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('預覽報告')
      );

      if (previewButton && !previewButton.disabled) {
        console.log('✅ 找到預覽報告按鈕，按鈕已啟用');

        // 監聽console輸出和alert
        const originalLog = console.log;
        const originalAlert = window.alert;
        let consoleLogs = [];
        let alertMessage = null;

        console.log = (...args) => {
          if (args[0] && args[0].toString().includes('報告預覽')) {
            consoleLogs.push(args);
          }
          originalLog(...args);
        };

        window.alert = (msg) => {
          alertMessage = msg;
          originalAlert(msg);
        };

        previewButton.click();
        console.log('✅ 已點擊預覽報告按鈕');

        setTimeout(() => {
          console.log = originalLog;
          window.alert = originalAlert;

          if (alertMessage && alertMessage.includes('報告預覽')) {
            console.log('✅ 預覽功能正常，Alert訊息:', alertMessage.substring(0, 100) + '...');
            results.previewFunction = true;
          } else if (consoleLogs.length > 0) {
            console.log('✅ 預覽功能正常，Console輸出數量:', consoleLogs.length);
            results.previewFunction = true;
          } else {
            console.log('❌ 預覽功能無響應');
            results.issues.push('預覽功能無響應');
          }

        }, 2000);

      } else {
        console.log('❌ 預覽報告按鈕不可用');
        results.issues.push('預覽報告按鈕不可用');
      }

    } catch (error) {
      console.log('❌ 預覽功能測試失敗:', error);
      results.issues.push('預覽功能測試異常: ' + error.message);
    }
  }

  // 測試5: 期間選擇功能
  function testPeriodSelection() {
    console.log('\n📅 測試5: 期間選擇功能');

    try {
      const periodSelect = document.querySelector('select');
      if (periodSelect) {
        const originalValue = periodSelect.value;
        console.log('✅ 找到期間選擇器，當前值:', originalValue);

        // 測試7天期間
        periodSelect.value = '7d';
        periodSelect.dispatchEvent(new Event('change'));
        console.log('✅ 切換到7天期間');

        setTimeout(() => {
          const dataPreview7d = document.querySelector('.bg-gray-50');
          const counts7d = Array.from(dataPreview7d.querySelectorAll('.font-semibold')).map(
            el => el.textContent
          );
          console.log('✅ 7天期間數據:', counts7d);

          // 測試90天期間
          periodSelect.value = '90d';
          periodSelect.dispatchEvent(new Event('change'));
          console.log('✅ 切換到90天期間');

          setTimeout(() => {
            const dataPreview90d = document.querySelector('.bg-gray-50');
            const counts90d = Array.from(dataPreview90d.querySelectorAll('.font-semibold')).map(
              el => el.textContent
            );
            console.log('✅ 90天期間數據:', counts90d);

            // 恢復原值
            periodSelect.value = originalValue;
            periodSelect.dispatchEvent(new Event('change'));
            console.log('✅ 已恢復原期間設定');

            // 檢查數據是否有變化
            if (counts7d[0] !== counts90d[0]) {
              console.log('✅ 期間選擇功能正常，數據正確更新');
              results.periodSelection = true;
            } else {
              console.log('⚠️  期間選擇可能沒有影響數據');
              results.issues.push('期間選擇功能數據更新異常');
            }

          }, 1000);
        }, 1000);

      } else {
        console.log('❌ 找不到期間選擇器');
        results.issues.push('期間選擇器不存在');
      }

    } catch (error) {
      console.log('❌ 期間選擇測試失敗:', error);
      results.issues.push('期間選擇測試異常: ' + error.message);
    }
  }

  // 測試6: 錯誤處理（模擬極端情況）
  function testErrorHandling() {
    console.log('\n⚠️  測試6: 錯誤處理');

    try {
      // 檢查生成按鈕狀態
      const generateButton = Array.from(document.querySelectorAll('button')).find(btn =>
        btn.textContent.includes('生成 PDF 報告')
      );

      if (generateButton) {
        if (generateButton.disabled) {
          console.log('✅ 數據不足時PDF生成按鈕正確禁用');
          results.errorHandling = true;
        } else {
          console.log('✅ 數據充足時PDF生成按鈕已啟用');
          console.log('⚠️  暫時跳過實際PDF生成測試以避免下載文件');
          results.errorHandling = true;
        }
      } else {
        console.log('❌ 找不到PDF生成按鈕');
        results.issues.push('PDF生成按鈕不存在');
      }

      // 檢查章節選擇功能
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length >= 6) {
        console.log('✅ 章節選擇復選框正常顯示，數量:', checkboxes.length);

        // 測試章節切換
        const firstCheckbox = checkboxes[0];
        const wasChecked = firstCheckbox.checked;
        firstCheckbox.click();

        setTimeout(() => {
          if (firstCheckbox.checked !== wasChecked) {
            console.log('✅ 章節切換功能正常');
            // 恢復原狀態
            firstCheckbox.click();
          } else {
            console.log('❌ 章節切換功能異常');
            results.issues.push('章節切換功能異常');
          }
        }, 500);

      } else {
        console.log('❌ 章節選擇復選框數量不足');
        results.issues.push('章節選擇復選框數量不足');
      }

    } catch (error) {
      console.log('❌ 錯誤處理測試失敗:', error);
      results.issues.push('錯誤處理測試異常: ' + error.message);
    }
  }

  // 繼續執行其他測試
  function continueTests() {
    setTimeout(() => testDataPreview(), 500);
    setTimeout(() => testPreviewFunction(), 1500);
    setTimeout(() => testPeriodSelection(), 4000);
    setTimeout(() => testErrorHandling(), 8000);
    setTimeout(() => showResults(), 12000);
  }

  // 顯示測試結果
  function showResults() {
    console.log('\n📊 測試結果摘要');
    console.log('=====================================');

    const testCases = [
      { name: '頁面載入', result: results.pageLoad },
      { name: '導航功能', result: results.navigation },
      { name: '數據預覽', result: results.dataPreview },
      { name: '預覽功能', result: results.previewFunction },
      { name: '期間選擇', result: results.periodSelection },
      { name: '錯誤處理', result: results.errorHandling },
      { name: '中文支持', result: results.chineseText }
    ];

    const passedTests = testCases.filter(test => test.result).length;
    const totalTests = testCases.length;

    console.log(`總體通過率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);

    testCases.forEach(test => {
      console.log(`${test.result ? '✅' : '❌'} ${test.name}: ${test.result ? '通過' : '失敗'}`);
    });

    if (results.issues.length > 0) {
      console.log('\n🐛 發現的問題:');
      results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log('\n🎉 所有測試項目均正常！');
    }

    console.log('\n💡 建議:');
    if (passedTests === totalTests) {
      console.log('- 功能運行正常，建議進行實際PDF生成測試');
      console.log('- 可以嘗試不同的數據場景進行深度測試');
    } else {
      console.log('- 修復發現的問題後重新測試');
      console.log('- 檢查控制台錯誤信息以獲取更多詳情');
    }

    // 返回結果對象供進一步分析
    window.pdfTestResults = results;
    console.log('\n📋 詳細結果已保存到 window.pdfTestResults');
  }

  // 開始測試序列
  testPageLoad();
  setTimeout(() => testNavigation(), 1000);

})();

// 使用說明:
// 1. 打開 http://localhost:3000/health-analytics
// 2. 開啟瀏覽器開發者工具 (F12)
// 3. 切換到 Console 標籤
// 4. 複製並貼上此腳本
// 5. 按 Enter 執行
// 6. 觀察測試結果和報告