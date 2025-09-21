// Google Sheets Sync Investigation Script
// This script systematically tests the sync functionality and identifies root causes

const { chromium } = require('playwright');

const INVESTIGATION_RESULTS = {
  authenticationState: null,
  networkRequests: [],
  consoleErrors: [],
  localStorageData: {},
  syncAttemptResults: [],
  googleSheetsApiCalls: [],
  rootCauseAnalysis: []
};

async function investigateGoogleSheetsSync() {
  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // 設置網路監聽
  page.on('request', request => {
    INVESTIGATION_RESULTS.networkRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      timestamp: new Date().toISOString()
    });
  });

  page.on('response', response => {
    if (response.url().includes('sheets.googleapis.com') ||
        response.url().includes('googleapis.com') ||
        response.url().includes('/api/')) {
      INVESTIGATION_RESULTS.googleSheetsApiCalls.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    }
  });

  // 監聽控制台錯誤
  page.on('console', msg => {
    if (msg.type() === 'error') {
      INVESTIGATION_RESULTS.consoleErrors.push({
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('🔍 開始 Google Sheets 同步問題調查...');

  try {
    // 步驟 1: 檢查首頁載入
    console.log('📱 1. 載入首頁...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 檢查本地存儲
    const localStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    INVESTIGATION_RESULTS.localStorageData.initial = localStorage;

    // 步驟 2: 前往食物日記頁面
    console.log('🍽️ 2. 進入食物日記頁面...');
    await page.click('a[href="/food-diary"]');
    await page.waitForLoadState('networkidle');

    // 檢查頁面載入狀態
    const pageLoaded = await page.evaluate(() => {
      return {
        hasQuickForm: !!document.querySelector('input[placeholder*="白米飯"]'),
        hasSyncButton: !!document.querySelector('button:has-text("立即同步")'),
        hasAuthInfo: !!document.querySelector('[class*="text-green-500"]'),
        url: window.location.href
      };
    });

    console.log('📊 頁面載入狀態:', pageLoaded);

    // 步驟 3: 檢查認證狀態
    console.log('🔐 3. 檢查 Google 認證狀態...');

    const authState = await page.evaluate(() => {
      return {
        isAuthenticated: window.localStorage.getItem('google_access_token') !== null,
        hasToken: !!window.localStorage.getItem('google_access_token'),
        hasRefreshToken: !!window.localStorage.getItem('google_refresh_token'),
        tokenExpiry: window.localStorage.getItem('google_token_expiry'),
        userId: window.localStorage.getItem('google_user_id')
      };
    });

    INVESTIGATION_RESULTS.authenticationState = authState;
    console.log('認證狀態:', authState);

    // 步驟 4: 添加測試食物記錄
    console.log('📝 4. 添加測試食物記錄...');

    await page.fill('input[placeholder*="白米飯"]', '測試食物 - 白米飯');
    await page.fill('input[placeholder*="1份"]', '1份');

    // 點擊記錄按鈕
    await page.click('button:has-text("記錄")');
    await page.waitForTimeout(2000); // 等待記錄處理

    // 檢查是否有成功提示
    const toastVisible = await page.isVisible('.toast, [class*="toast"]').catch(() => false);
    console.log('Toast 提示可見:', toastVisible);

    // 步驟 5: 嘗試手動同步
    console.log('🔄 5. 測試手動同步...');

    const syncButtonEnabled = await page.isEnabled('button:has-text("立即同步")');
    console.log('同步按鈕可用:', syncButtonEnabled);

    if (syncButtonEnabled) {
      await page.click('button:has-text("立即同步")');
      await page.waitForTimeout(3000); // 等待同步完成

      // 檢查同步結果
      const syncResult = await page.evaluate(() => {
        const pendingBadge = document.querySelector('[class*="待同步"]');
        const syncStatus = document.querySelector('[class*="已同步"]');
        return {
          hasPendingItems: !!pendingBadge,
          pendingCount: pendingBadge ? pendingBadge.textContent : null,
          syncSuccess: !!syncStatus,
          currentUrl: window.location.href
        };
      });

      INVESTIGATION_RESULTS.syncAttemptResults.push(syncResult);
      console.log('同步結果:', syncResult);
    }

    // 步驟 6: 檢查本地存儲中的待同步數據
    console.log('💾 6. 檢查本地存儲數據...');

    const finalLocalStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    INVESTIGATION_RESULTS.localStorageData.afterSync = finalLocalStorage;

    // 步驟 7: 直接檢查 Google Sheets API
    console.log('📊 7. 檢查 Google Sheets API 直接訪問...');

    if (authState.hasToken) {
      try {
        // 嘗試直接調用 Google Sheets API
        const apiResult = await page.evaluate(async () => {
          const token = localStorage.getItem('google_access_token');
          const userId = localStorage.getItem('google_user_id') || 'demo-user';
          const spreadsheetId = localStorage.getItem(`diet_daily_sheet_${userId}`);

          if (!token || !spreadsheetId) {
            return { error: 'Missing token or spreadsheet ID', token: !!token, spreadsheetId: !!spreadsheetId };
          }

          try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            return {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              spreadsheetId,
              hasToken: !!token
            };
          } catch (error) {
            return { error: error.message, spreadsheetId, hasToken: !!token };
          }
        });

        INVESTIGATION_RESULTS.googleSheetsApiCalls.push({
          type: 'direct_api_test',
          result: apiResult,
          timestamp: new Date().toISOString()
        });

        console.log('Google Sheets API 直接測試結果:', apiResult);
      } catch (error) {
        console.error('API 測試失敗:', error);
      }
    }

    // 步驟 8: 根本原因分析
    console.log('🔬 8. 進行根本原因分析...');

    const rootCauseAnalysis = analyzeRootCause();
    INVESTIGATION_RESULTS.rootCauseAnalysis = rootCauseAnalysis;

    console.log('\n=== 調查結果總結 ===');
    console.log('認證狀態:', INVESTIGATION_RESULTS.authenticationState);
    console.log('API 調用次數:', INVESTIGATION_RESULTS.googleSheetsApiCalls.length);
    console.log('控制台錯誤數:', INVESTIGATION_RESULTS.consoleErrors.length);
    console.log('根本原因分析:', rootCauseAnalysis);

  } catch (error) {
    console.error('調查過程中發生錯誤:', error);
    INVESTIGATION_RESULTS.rootCauseAnalysis.push({
      category: 'script_error',
      description: error.message,
      severity: 'high'
    });
  } finally {
    // 生成詳細報告
    await generateInvestigationReport();

    await browser.close();
  }
}

function analyzeRootCause() {
  const analysis = [];

  // 認證相關問題
  if (!INVESTIGATION_RESULTS.authenticationState?.isAuthenticated) {
    analysis.push({
      category: 'authentication',
      description: 'User is not authenticated with Google',
      severity: 'critical',
      recommendation: 'Implement proper Google OAuth flow'
    });
  }

  // API 調用問題
  const failedApiCalls = INVESTIGATION_RESULTS.googleSheetsApiCalls.filter(call => call.status >= 400);
  if (failedApiCalls.length > 0) {
    analysis.push({
      category: 'api_failure',
      description: `${failedApiCalls.length} API calls failed`,
      severity: 'high',
      recommendation: 'Check API permissions and token validity'
    });
  }

  // 網路請求問題
  const sheetsRequests = INVESTIGATION_RESULTS.networkRequests.filter(req =>
    req.url.includes('sheets.googleapis.com')
  );

  if (sheetsRequests.length === 0) {
    analysis.push({
      category: 'no_api_calls',
      description: 'No Google Sheets API calls were made',
      severity: 'critical',
      recommendation: 'Check if sync logic is properly triggering API calls'
    });
  }

  // 控制台錯誤
  if (INVESTIGATION_RESULTS.consoleErrors.length > 0) {
    analysis.push({
      category: 'console_errors',
      description: `${INVESTIGATION_RESULTS.consoleErrors.length} console errors detected`,
      severity: 'medium',
      recommendation: 'Fix JavaScript errors that may interfere with sync'
    });
  }

  // Mock 服務檢查
  const mockServiceUsage = INVESTIGATION_RESULTS.networkRequests.some(req =>
    req.url.includes('mock') ||
    INVESTIGATION_RESULTS.consoleErrors.some(error => error.text.includes('Mock'))
  );

  if (mockServiceUsage) {
    analysis.push({
      category: 'mock_services',
      description: 'Application is using mock services instead of real Google APIs',
      severity: 'critical',
      recommendation: 'Replace mock services with real Google Sheets API implementation'
    });
  }

  return analysis;
}

async function generateInvestigationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      authentication: INVESTIGATION_RESULTS.authenticationState,
      apiCallCount: INVESTIGATION_RESULTS.googleSheetsApiCalls.length,
      errorCount: INVESTIGATION_RESULTS.consoleErrors.length,
      syncAttempts: INVESTIGATION_RESULTS.syncAttemptResults.length
    },
    detailedFindings: INVESTIGATION_RESULTS,
    recommendations: INVESTIGATION_RESULTS.rootCauseAnalysis
  };

  console.log('\n🔬 === 詳細調查報告 ===');
  console.log(JSON.stringify(report, null, 2));

  // 寫入報告文件
  require('fs').writeFileSync(
    'google-sheets-sync-investigation-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n📝 調查報告已保存到: google-sheets-sync-investigation-report.json');
}

// 執行調查
if (require.main === module) {
  investigateGoogleSheetsSync().catch(console.error);
}

module.exports = { investigateGoogleSheetsSync };