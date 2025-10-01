/**
 * E2E 測試: 醫療工作流程
 * 測試完整的醫療食品追蹤用戶旅程
 */

import { test, expect, Page } from '@playwright/test';

// 測試數據
const TEST_USER = {
  email: 'test.patient@example.com',
  password: 'SecurePassword123!',
  medicalConditions: ['IBD', 'IBS'],
  allergies: ['花生', '牛奶'],
};

const TEST_FOODS = [
  { name: '白米飯', expectedScore: '好', category: '主食' },
  { name: '高纖維蔬菜', expectedScore: '普通', category: '蔬菜' },
  { name: '花生', expectedScore: '差', category: '堅果' },
];

test.describe('醫療食品追蹤工作流程', () => {
  test.beforeEach(async ({ page }) => {
    // 導航到應用首頁
    await page.goto('/');

    // 等待頁面載入
    await page.waitForLoadState('networkidle');
  });

  test('完整用戶註冊和醫療設定流程', async ({ page }) => {
    // 1. 用戶註冊
    await test.step('用戶註冊', async () => {
      await page.click('[data-testid="auth-signup-button"]');
      await page.fill('[data-testid="email-input"]', TEST_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_USER.password);
      await page.click('[data-testid="signup-submit"]');

      // 等待註冊完成
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    });

    // 2. 醫療資料設定
    await test.step('醫療資料設定', async () => {
      // 導航到醫療設定頁面
      await page.click('[data-testid="setup-medical-profile"]');

      // 選擇醫療條件
      for (const condition of TEST_USER.medicalConditions) {
        await page.check(`[data-testid="condition-${condition}"]`);
      }

      // 設定過敏原
      for (const allergy of TEST_USER.allergies) {
        await page.fill('[data-testid="allergy-input"]', allergy);
        await page.click('[data-testid="add-allergy"]');
      }

      // 提交醫療資料
      await page.click('[data-testid="save-medical-profile"]');

      // 驗證設定成功
      await expect(page.locator('[data-testid="medical-setup-complete"]')).toBeVisible();
    });

    // 3. 醫療資料驗證
    await test.step('醫療資料驗證', async () => {
      // 檢查醫療條件是否正確顯示
      for (const condition of TEST_USER.medicalConditions) {
        await expect(page.locator(`[data-testid="active-condition-${condition}"]`)).toBeVisible();
      }

      // 檢查過敏原是否正確顯示
      for (const allergy of TEST_USER.allergies) {
        await expect(page.locator(`[data-testid="active-allergy-${allergy}"]`)).toBeVisible();
      }
    });
  });

  test('食物搜索和醫療評分流程', async ({ page }) => {
    // 預設：用戶已登入並設定醫療資料
    await setupAuthenticatedUser(page);

    for (const food of TEST_FOODS) {
      await test.step(`測試食物: ${food.name}`, async () => {
        // 1. 搜索食物
        await page.fill('[data-testid="food-search-input"]', food.name);
        await page.press('[data-testid="food-search-input"]', 'Enter');

        // 等待搜索結果
        await page.waitForSelector('[data-testid="search-results"]');

        // 2. 選擇食物
        await page.click(`[data-testid="food-item-${food.name}"]`);

        // 3. 檢查醫療評分
        const scoreElement = page.locator('[data-testid="medical-score"]');
        await expect(scoreElement).toContainText(food.expectedScore);

        // 4. 檢查風險因素（如果適用）
        if (food.name === '花生') {
          await expect(page.locator('[data-testid="allergy-warning"]')).toBeVisible();
          await expect(page.locator('[data-testid="allergy-warning"]')).toContainText('花生');
        }

        // 5. 檢查建議（如果適用）
        if (food.expectedScore === '差') {
          await expect(page.locator('[data-testid="medical-recommendations"]')).toBeVisible();
        }

        // 6. 添加到食物日記
        await page.click('[data-testid="add-to-diary"]');

        // 設定份量
        await page.fill('[data-testid="portion-size"]', '100');
        await page.selectOption('[data-testid="portion-unit"]', 'g');

        // 確認添加
        await page.click('[data-testid="confirm-add-food"]');

        // 驗證添加成功
        await expect(page.locator('[data-testid="add-success-message"]')).toBeVisible();
      });
    }
  });

  test('醫療報告生成和導出流程', async ({ page }) => {
    // 預設：用戶已添加多個食物項目
    await setupUserWithFoodHistory(page);

    await test.step('生成醫療報告', async () => {
      // 導航到報告頁面
      await page.click('[data-testid="reports-nav"]');

      // 選擇報告時間範圍
      await page.selectOption('[data-testid="report-period"]', 'weekly');

      // 生成報告
      await page.click('[data-testid="generate-report"]');

      // 等待報告生成
      await page.waitForSelector('[data-testid="report-content"]');

      // 驗證報告內容
      await expect(page.locator('[data-testid="nutrition-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="medical-insights"]')).toBeVisible();
      await expect(page.locator('[data-testid="food-recommendations"]')).toBeVisible();
    });

    await test.step('導出 PDF 報告', async () => {
      // 點擊 PDF 導出按鈕
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf"]');

      // 等待下載完成
      const download = await downloadPromise;

      // 驗證文件名和類型
      expect(download.suggestedFilename()).toMatch(/medical-report-.*\.pdf/);

      // 驗證文件大小（應該不為空）
      const path = await download.path();
      const fs = require('fs');
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(1000); // 至少 1KB
    });
  });

  test('症狀追蹤和食物關聯分析', async ({ page }) => {
    // 預設：用戶已設定醫療資料
    await setupAuthenticatedUser(page);

    await test.step('記錄症狀', async () => {
      // 導航到症狀追蹤
      await page.click('[data-testid="symptoms-nav"]');

      // 添加症狀
      await page.click('[data-testid="add-symptom"]');

      // 選擇症狀類型
      await page.selectOption('[data-testid="symptom-type"]', 'abdominal_pain');

      // 設定嚴重程度
      await page.click('[data-testid="severity-moderate"]');

      // 添加備註
      await page.fill('[data-testid="symptom-notes"]', '午餐後開始感到不適');

      // 保存症狀
      await page.click('[data-testid="save-symptom"]');

      // 驗證症狀記錄
      await expect(page.locator('[data-testid="symptom-list"]')).toContainText('腹痛');
    });

    await test.step('查看食物症狀關聯', async () => {
      // 導航到分析頁面
      await page.click('[data-testid="analysis-nav"]');

      // 選擇分析類型
      await page.click('[data-testid="food-symptom-correlation"]');

      // 等待分析結果
      await page.waitForSelector('[data-testid="correlation-results"]');

      // 檢查是否有關聯分析
      await expect(page.locator('[data-testid="correlation-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="risk-foods-list"]')).toBeVisible();
    });
  });

  test('離線功能和數據同步', async ({ page }) => {
    // 預設：用戶已登入
    await setupAuthenticatedUser(page);

    await test.step('離線模式測試', async () => {
      // 斷開網絡連接
      await page.context().setOffline(true);

      // 嘗試添加食物（應該使用離線緩存）
      await page.fill('[data-testid="food-search-input"]', '白米飯');
      await page.press('[data-testid="food-search-input"]', 'Enter');

      // 檢查離線指示器
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // 添加食物到離線緩存
      await page.click('[data-testid="food-item-white-rice"]');
      await page.click('[data-testid="add-to-diary"]');
      await page.fill('[data-testid="portion-size"]', '150');
      await page.click('[data-testid="confirm-add-food"]');

      // 檢查離線保存指示
      await expect(page.locator('[data-testid="offline-save-notice"]')).toBeVisible();
    });

    await test.step('重新連線和數據同步', async () => {
      // 重新連接網絡
      await page.context().setOffline(false);

      // 觸發同步
      await page.click('[data-testid="sync-button"]');

      // 等待同步完成
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();

      // 驗證數據已同步
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });
  });

  test('性能和可訪問性驗證', async ({ page }) => {
    await test.step('頁面性能檢查', async () => {
      // 測量頁面載入時間
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 驗證載入時間在可接受範圍內（3秒）
      expect(loadTime).toBeLessThan(3000);

      // 檢查 Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};

            entries.forEach((entry) => {
              if (entry.entryType === 'paint') {
                vitals[entry.name] = entry.startTime;
              }
            });

            resolve(vitals);
          }).observe({ entryTypes: ['paint'] });

          // 觸發觀察者
          setTimeout(() => resolve({}), 1000);
        });
      });

      // 驗證 First Contentful Paint
      if (metrics['first-contentful-paint']) {
        expect(metrics['first-contentful-paint']).toBeLessThan(1500);
      }
    });

    await test.step('可訪問性檢查', async () => {
      // 檢查基本的可訪問性功能

      // 鍵盤導航
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();

      // ARIA 標籤檢查
      const ariaLabels = await page.$$('[aria-label]');
      expect(ariaLabels.length).toBeGreaterThan(0);

      // 跳過連結檢查
      const skipLink = page.locator('[href="#main-content"]');
      await expect(skipLink).toBeInTheDocument();
    });
  });
});

// 輔助函數
async function setupAuthenticatedUser(page: Page) {
  // 模擬已認證用戶狀態
  const testUser = TEST_USER;
  await page.evaluate((user) => {
    localStorage.setItem('auth-token', 'mock-jwt-token');
    localStorage.setItem('user-profile', JSON.stringify({
      id: 'test-user-id',
      email: user.email,
      medicalConditions: user.medicalConditions,
      allergies: user.allergies,
    }));
  }, testUser);

  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function setupUserWithFoodHistory(page: Page) {
  await setupAuthenticatedUser(page);

  // 模擬食物歷史數據
  await page.evaluate(() => {
    const mockFoodHistory = [
      {
        id: '1',
        food_name: '白米飯',
        portion_size: 100,
        created_at: new Date().toISOString(),
        medical_score: 4,
      },
      {
        id: '2',
        food_name: '高纖維蔬菜',
        portion_size: 80,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        medical_score: 2,
      },
    ];

    localStorage.setItem('food-history', JSON.stringify(mockFoodHistory));
  });
}