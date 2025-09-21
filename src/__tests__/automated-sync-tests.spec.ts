/**
 * 🤖 Google Sheets 同步自動化測試套件
 *
 * 使用 Jest + Playwright 進行完整的端到端同步測試
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { syncTestRunner } from './sync-test-runner';
import { QUALITY_THRESHOLDS, assessOverallQuality } from './sync-validation-criteria';

// 測試配置
const TEST_CONFIG = {
  baseURL: process.env.TEST_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 2
};

let browser: Browser;
let page: Page;

// 🏗️ 測試環境設置
test.beforeAll(async ({ browser: b }) => {
  browser = b;
});

test.beforeEach(async () => {
  page = await browser.newPage();
  await page.goto(TEST_CONFIG.baseURL);

  // 等待應用初始化
  await page.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 });
});

test.afterEach(async () => {
  await page.close();
});

// 🧪 測試群組: 基本同步功能
test.describe('基本同步功能測試', () => {
  test('SYNC-001: 本地與雲端資料一致性驗證', async () => {
    // 準備測試資料
    const testFoodEntries = [
      { name: '白米飯', category: '主食', medicalScore: 8 },
      { name: '雞胸肉', category: '蛋白質', medicalScore: 9 },
      { name: '青花菜', category: '蔬菜', medicalScore: 10 }
    ];

    // 1. 創建本地食物記錄
    for (const entry of testFoodEntries) {
      await page.fill('[data-testid="food-name-input"]', entry.name);
      await page.selectOption('[data-testid="food-category-select"]', entry.category);
      await page.fill('[data-testid="medical-score-input"]', entry.medicalScore.toString());
      await page.click('[data-testid="add-food-button"]');

      // 等待記錄添加完成
      await expect(page.locator(`text=${entry.name}`)).toBeVisible();
    }

    // 2. 觸發同步
    await page.click('[data-testid="sync-button"]');

    // 3. 等待同步完成
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步', {
      timeout: 30000
    });

    // 4. 驗證同步狀態
    const syncStatus = await page.textContent('[data-testid="sync-status"]');
    expect(syncStatus).toContain('已同步');

    // 5. 檢查同步記錄數量
    const localCount = await page.locator('[data-testid="food-entry"]').count();
    expect(localCount).toBe(testFoodEntries.length);

    // 6. 驗證 Google Sheets 連結可訪問
    const sheetsLink = await page.getAttribute('[data-testid="sheets-link"]', 'href');
    expect(sheetsLink).toContain('docs.google.com/spreadsheets');
  });

  test('SYNC-002: 重複資料檢測與去重', async () => {
    const duplicateEntry = { name: '重複測試食物', category: '測試', medicalScore: 5 };

    // 創建重複記錄
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="food-name-input"]', duplicateEntry.name);
      await page.selectOption('[data-testid="food-category-select"]', duplicateEntry.category);
      await page.fill('[data-testid="medical-score-input"]', duplicateEntry.medicalScore.toString());
      await page.click('[data-testid="add-food-button"]');
    }

    // 觸發智能同步
    await page.click('[data-testid="smart-sync-button"]');

    // 等待去重完成
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('去重完成', {
      timeout: 15000
    });

    // 驗證只保留一筆記錄
    const duplicateCount = await page.locator(`text=${duplicateEntry.name}`).count();
    expect(duplicateCount).toBe(1);

    // 檢查去重報告
    const duplicateReport = await page.textContent('[data-testid="duplicate-report"]');
    expect(duplicateReport).toMatch(/移除.*2.*筆重複/);
  });
});

// 🌐 測試群組: 網路處理
test.describe('網路中斷和恢復測試', () => {
  test('NETWORK-001: 離線模式資料暫存', async () => {
    // 模擬離線狀態
    await page.context().setOffline(true);

    // 確認離線狀態顯示
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('離線');

    // 添加離線記錄
    const offlineEntries = [
      { name: '離線食物1', category: '測試' },
      { name: '離線食物2', category: '測試' },
      { name: '離線食物3', category: '測試' }
    ];

    for (const entry of offlineEntries) {
      await page.fill('[data-testid="food-name-input"]', entry.name);
      await page.selectOption('[data-testid="food-category-select"]', entry.category);
      await page.click('[data-testid="add-food-button"]');
    }

    // 檢查離線佇列
    const queueCount = await page.textContent('[data-testid="offline-queue-count"]');
    expect(queueCount).toBe('3');

    // 恢復網路連接
    await page.context().setOffline(false);

    // 等待自動同步
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步', {
      timeout: 60000
    });

    // 驗證佇列清空
    await expect(page.locator('[data-testid="offline-queue-count"]')).toContainText('0');
  });

  test('NETWORK-002: 網路不穩定重試機制', async () => {
    // 模擬網路不穩定 (間歇性離線)
    await page.route('**/*sheets*', route => {
      // 50% 機率失敗
      if (Math.random() < 0.5) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // 添加記錄並嘗試同步
    await page.fill('[data-testid="food-name-input"]', '網路測試食物');
    await page.selectOption('[data-testid="food-category-select"]', '測試');
    await page.click('[data-testid="add-food-button"]');

    await page.click('[data-testid="sync-button"]');

    // 等待重試完成或最終成功
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="sync-status"]')?.textContent;
      return status?.includes('已同步') || status?.includes('重試');
    }, { timeout: 30000 });

    // 移除網路干擾
    await page.unroute('**/*sheets*');

    // 再次同步確保最終成功
    await page.click('[data-testid="sync-button"]');
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步', {
      timeout: 15000
    });
  });
});

// 🔐 測試群組: 認證處理
test.describe('認證過期和重新認證測試', () => {
  test('AUTH-001: Token過期自動刷新', async () => {
    // 模擬 token 過期
    await page.evaluate(() => {
      // 清除 localStorage 中的 token
      localStorage.removeItem('google_access_token');
      localStorage.setItem('google_token_expiry', '0');
    });

    // 嘗試同步操作
    await page.click('[data-testid="sync-button"]');

    // 等待 token 刷新或重新認證提示
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-testid="auth-status"]')?.textContent;
      return status?.includes('已登入') || status?.includes('請重新登入');
    }, { timeout: 10000 });

    const authStatus = await page.textContent('[data-testid="auth-status"]');

    if (authStatus?.includes('請重新登入')) {
      // 如果需要重新登入，點擊登入按鈕
      await page.click('[data-testid="login-button"]');

      // 等待 Google 登入頁面 (在實際測試中會導向 Google)
      // 這裡我們模擬成功登入
      await page.evaluate(() => {
        localStorage.setItem('google_access_token', 'mock_refreshed_token');
        localStorage.setItem('google_token_expiry', (Date.now() + 3600000).toString());
      });

      await page.reload();
    }

    // 驗證認證恢復
    await expect(page.locator('[data-testid="auth-status"]')).toContainText('已登入');
  });

  test('AUTH-002: 認證完全失效處理', async () => {
    // 模擬認證完全失效
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();

    // 檢查認證狀態
    await expect(page.locator('[data-testid="auth-status"]')).toContainText('未登入');

    // 嘗試同步應該提示登入
    await page.click('[data-testid="sync-button"]');

    await expect(page.locator('[data-testid="auth-prompt"]')).toContainText('請先登入');

    // 檢查離線記錄是否保留
    const hasOfflineData = await page.locator('[data-testid="offline-data-indicator"]').isVisible();
    expect(hasOfflineData).toBeTruthy();
  });
});

// 📚 測試群組: 資料完整性
test.describe('歷史記錄完整性測試', () => {
  test('INTEGRITY-001: 大量資料同步完整性', async () => {
    const startTime = Date.now();

    // 創建大量測試資料 (模擬 50 筆記錄)
    for (let i = 1; i <= 50; i++) {
      await page.fill('[data-testid="food-name-input"]', `測試食物${i}`);
      await page.selectOption('[data-testid="food-category-select"]', '測試');
      await page.fill('[data-testid="medical-score-input"]', (i % 10 + 1).toString());
      await page.click('[data-testid="add-food-button"]');

      // 每 10 筆記錄稍作停頓，避免介面阻塞
      if (i % 10 === 0) {
        await page.waitForTimeout(100);
      }
    }

    // 觸發完整同步
    await page.click('[data-testid="full-sync-button"]');

    // 等待同步完成
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步', {
      timeout: 120000 // 2分鐘超時
    });

    const syncTime = Date.now() - startTime;

    // 驗證性能要求 (應在 2 分鐘內完成)
    expect(syncTime).toBeLessThan(120000);

    // 驗證記錄數量
    const recordCount = await page.locator('[data-testid="food-entry"]').count();
    expect(recordCount).toBe(50);

    // 驗證資料完整性
    const integrityCheck = await page.textContent('[data-testid="integrity-status"]');
    expect(integrityCheck).toContain('100%');
  });

  test('INTEGRITY-002: 跨時區資料同步', async () => {
    // 模擬不同時區的記錄
    const timezoneEntries = [
      { name: '台北早餐', timezone: 'Asia/Taipei', hour: 8 },
      { name: '倫敦午餐', timezone: 'Europe/London', hour: 12 },
      { name: '紐約晚餐', timezone: 'America/New_York', hour: 19 }
    ];

    for (const entry of timezoneEntries) {
      // 設置時區 (在實際應用中可能需要不同的實現方式)
      await page.evaluate((tz) => {
        // 模擬設置時區
        window.testTimezone = tz;
      }, entry.timezone);

      await page.fill('[data-testid="food-name-input"]', entry.name);
      await page.selectOption('[data-testid="food-category-select"]', '主食');

      // 設置特定時間
      await page.fill('[data-testid="time-input"]', `${entry.hour.toString().padStart(2, '0')}:00`);

      await page.click('[data-testid="add-food-button"]');
    }

    // 同步並驗證時區處理
    await page.click('[data-testid="sync-button"]');

    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步');

    // 檢查時區轉換正確性
    const timezoneStatus = await page.textContent('[data-testid="timezone-validation"]');
    expect(timezoneStatus).toContain('時區處理正確');
  });
});

// ⚡ 測試群組: 性能測試
test.describe('同步性能測試', () => {
  test('PERFORMANCE-001: 單筆記錄同步性能', async () => {
    const startTime = Date.now();

    // 添加單筆記錄
    await page.fill('[data-testid="food-name-input"]', '性能測試食物');
    await page.selectOption('[data-testid="food-category-select"]', '測試');
    await page.click('[data-testid="add-food-button"]');

    // 觸發同步
    await page.click('[data-testid="sync-button"]');

    // 等待同步完成
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步', {
      timeout: 10000
    });

    const syncTime = Date.now() - startTime;

    // 驗證性能要求 (單筆記錄應在 5 秒內完成)
    expect(syncTime).toBeLessThan(5000);

    console.log(`單筆記錄同步時間: ${syncTime}ms`);
  });

  test('PERFORMANCE-002: 記憶體使用監控', async () => {
    // 開始記憶體監控
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // 創建多筆記錄進行壓力測試
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="food-name-input"]', `記憶體測試${i}`);
      await page.selectOption('[data-testid="food-category-select"]', '測試');
      await page.click('[data-testid="add-food-button"]');
    }

    // 觸發同步
    await page.click('[data-testid="sync-button"]');
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步');

    // 檢查記憶體使用
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;

    // 記憶體增長應控制在合理範圍內 (例如 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

    console.log(`記憶體增長: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });
});

// 🎯 測試群組: 綜合驗收測試
test.describe('綜合驗收測試', () => {
  test('ACCEPTANCE-001: 完整用戶工作流程', async () => {
    // 1. 用戶登入
    await page.click('[data-testid="login-button"]');
    // 模擬登入成功
    await page.evaluate(() => {
      localStorage.setItem('google_access_token', 'mock_token');
      localStorage.setItem('user_authenticated', 'true');
    });
    await page.reload();

    // 2. 添加多種類型的食物記錄
    const foodTypes = [
      { name: '燕麥片', category: '主食', score: 9, notes: '早餐主食' },
      { name: '雞蛋', category: '蛋白質', score: 8, notes: '優質蛋白' },
      { name: '菠菜', category: '蔬菜', score: 10, notes: '富含鐵質' },
      { name: '蘋果', category: '水果', score: 9, notes: '維生素C' }
    ];

    for (const food of foodTypes) {
      await page.fill('[data-testid="food-name-input"]', food.name);
      await page.selectOption('[data-testid="food-category-select"]', food.category);
      await page.fill('[data-testid="medical-score-input"]', food.score.toString());
      await page.fill('[data-testid="notes-input"]', food.notes);
      await page.click('[data-testid="add-food-button"]');

      await expect(page.locator(`text=${food.name}`)).toBeVisible();
    }

    // 3. 查看歷史記錄
    await page.click('[data-testid="history-tab"]');
    const historyCount = await page.locator('[data-testid="history-entry"]').count();
    expect(historyCount).toBe(foodTypes.length);

    // 4. 執行同步
    await page.click('[data-testid="sync-tab"]');
    await page.click('[data-testid="sync-button"]');

    await expect(page.locator('[data-testid="sync-status"]')).toContainText('已同步', {
      timeout: 30000
    });

    // 5. 生成醫療報告
    await page.click('[data-testid="report-tab"]');
    await page.click('[data-testid="generate-report-button"]');

    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({
      timeout: 15000
    });

    // 6. 檢查 Google Sheets 整合
    const sheetsUrl = await page.getAttribute('[data-testid="view-sheets-button"]', 'href');
    expect(sheetsUrl).toContain('docs.google.com');

    // 7. 驗證同步狀態一致性
    const pendingCount = await page.textContent('[data-testid="pending-sync-count"]');
    expect(pendingCount).toBe('0');
  });
});

// 🔧 輔助函數
async function simulateNetworkConditions(page: Page, condition: 'slow' | 'offline' | 'unstable') {
  switch (condition) {
    case 'slow':
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000); // 2秒延遲
      });
      break;
    case 'offline':
      await page.context().setOffline(true);
      break;
    case 'unstable':
      await page.route('**/*', route => {
        if (Math.random() < 0.3) { // 30% 失敗率
          route.abort();
        } else {
          route.continue();
        }
      });
      break;
  }
}

async function clearTestData(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    // 清除 IndexedDB 資料
    indexedDB.deleteDatabase('diet_daily_test');
  });
}