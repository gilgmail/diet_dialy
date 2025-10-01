/**
 * E2E 測試: 用戶流程自動化
 * 測試關鍵用戶旅程和業務流程
 */

import { test, expect, Page } from '@playwright/test';
import {
  mockAuthenticatedUser,
  setupUserHistory,
  waitForPageLoad
} from './helpers/auth-helpers';
import {
  testCompleteAteFoodFlow,
  testMultipleFoods,
  verifyMedicalScore,
  getNutritionInfo
} from './helpers/food-helpers';
import { TEST_FOODS, TEST_USERS, UI_SELECTORS } from './fixtures/test-data';

test.describe('用戶流程自動化測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('新用戶完整 onboarding 流程', async ({ page }) => {
    // This test starts with a completely new user (no authentication mocking needed)
    // Clear any existing state to ensure clean start
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await test.step('用戶註冊流程', async () => {
      await page.goto('/');
      await page.click('[data-testid="get-started-button"]');

      // 填寫基本資料
      await page.fill('[data-testid="signup-email"]', 'newuser@example.com');
      await page.fill('[data-testid="signup-password"]', 'NewUser123!');
      await page.fill('[data-testid="signup-confirm-password"]', 'NewUser123!');
      await page.click('[data-testid="signup-submit"]');

      await expect(page.locator('[data-testid="signup-success"]')).toBeVisible();
    });

    await test.step('醫療檔案設定導引', async () => {
      // 應該自動跳轉到醫療設定頁面
      await expect(page.locator('[data-testid="medical-setup-wizard"]')).toBeVisible();

      // 步驟 1: 醫療條件選擇
      await page.check('[data-testid="condition-IBD"]');
      await page.click('[data-testid="next-step"]');

      // 步驟 2: 過敏原設定
      await page.fill('[data-testid="allergy-input"]', '花生');
      await page.click('[data-testid="add-allergy"]');
      await page.fill('[data-testid="allergy-input"]', '牛奶');
      await page.click('[data-testid="add-allergy"]');
      await page.click('[data-testid="next-step"]');

      // 步驟 3: 個人資料
      await page.fill('[data-testid="profile-age"]', '35');
      await page.selectOption('[data-testid="profile-gender"]', 'female');
      await page.fill('[data-testid="profile-weight"]', '60');
      await page.fill('[data-testid="profile-height"]', '165');
      await page.click('[data-testid="complete-setup"]');

      await expect(page.locator('[data-testid="setup-completion"]')).toBeVisible();
    });

    await test.step('首次使用教學', async () => {
      // 應該顯示使用教學
      await expect(page.locator('[data-testid="tutorial-overlay"]')).toBeVisible();

      // 完成教學步驟
      await page.click('[data-testid="tutorial-next"]'); // 食物搜索介紹
      await page.click('[data-testid="tutorial-next"]'); // 醫療評分說明
      await page.click('[data-testid="tutorial-next"]'); // 症狀記錄介紹
      await page.click('[data-testid="tutorial-finish"]');

      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    });
  });

  test('日常食物記錄完整流程', async ({ page }) => {
    // This test requires authenticated user
    await mockAuthenticatedUser(page, 'patient');
    await test.step('記錄早餐', async () => {
      await page.click('[data-testid="add-meal-breakfast"]');

      // 添加燕麥
      await testCompleteAteFoodFlow(page, '燕麥', 50, 'g');

      // 添加牛奶 (應顯示過敏警告)
      await page.fill(UI_SELECTORS.food.searchInput, '牛奶');
      await page.press(UI_SELECTORS.food.searchInput, 'Enter');
      await page.click('[data-testid="food-item-牛奶"]');

      // 驗證過敏警告
      await expect(page.locator(UI_SELECTORS.food.allergyWarning)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.food.allergyWarning)).toContainText('牛奶');

      // 用戶仍可選擇添加 (知情情況下)
      await page.click('[data-testid="acknowledge-allergy"]');
      await page.click(UI_SELECTORS.food.addToDialy);
      await page.fill(UI_SELECTORS.food.portionSize, '200');
      await page.selectOption(UI_SELECTORS.food.portionUnit, 'ml');
      await page.click(UI_SELECTORS.food.confirmAdd);
    });

    await test.step('記錄午餐', async () => {
      await page.click('[data-testid="add-meal-lunch"]');

      // 添加白米飯和深海魚
      await testMultipleFoods(page, [
        { name: '白米飯', portionSize: 150, unit: 'g' },
        { name: '深海魚', portionSize: 120, unit: 'g' }
      ]);
    });

    await test.step('檢視每日營養摘要', async () => {
      await page.click('[data-testid="daily-summary"]');

      // 驗證營養總計
      await expect(page.locator('[data-testid="daily-calories"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-protein"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-carbs"]')).toBeVisible();

      // 驗證醫療分數摘要
      await expect(page.locator('[data-testid="daily-medical-score"]')).toBeVisible();
      const scoreText = await page.locator('[data-testid="daily-medical-score"]').textContent();
      expect(scoreText).toMatch(/[1-5]/); // 應該有分數
    });
  });

  test('症狀追蹤和食物關聯分析流程', async ({ page }) => {
    // This test requires authenticated user
    await mockAuthenticatedUser(page, 'patient');
    // 先設定一些食物歷史
    await setupUserHistory(page);

    await test.step('記錄症狀', async () => {
      await page.click(UI_SELECTORS.symptoms.nav);

      // 記錄腹痛
      await page.click(UI_SELECTORS.symptoms.addButton);
      await page.selectOption(UI_SELECTORS.symptoms.typeSelect, 'abdominal_pain');
      await page.click('[data-testid="severity-moderate"]');
      await page.fill(UI_SELECTORS.symptoms.notesInput, '午餐後 2 小時開始腹痛');
      await page.click(UI_SELECTORS.symptoms.saveButton);

      await expect(page.locator(UI_SELECTORS.symptoms.list)).toContainText('腹痛');
    });

    await test.step('查看食物症狀關聯', async () => {
      await page.click(UI_SELECTORS.analysis.nav);
      await page.click(UI_SELECTORS.analysis.correlationButton);

      // 等待分析完成
      await page.waitForSelector(UI_SELECTORS.analysis.results);

      // 檢查關聯圖表
      await expect(page.locator(UI_SELECTORS.analysis.chart)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.analysis.riskFoodsList)).toBeVisible();
    });

    await test.step('獲取個人化建議', async () => {
      await page.click('[data-testid="get-recommendations"]');

      // 驗證建議內容
      await expect(page.locator('[data-testid="personalized-recommendations"]')).toBeVisible();
      await expect(page.locator('[data-testid="food-alternatives"]')).toBeVisible();
      await expect(page.locator('[data-testid="eating-tips"]')).toBeVisible();
    });
  });

  test('週報生成和分享流程', async ({ page }) => {
    // This test requires authenticated user
    await mockAuthenticatedUser(page, 'patient');
    await setupUserHistory(page);

    await test.step('生成週報', async () => {
      await page.click(UI_SELECTORS.reports.nav);
      await page.selectOption(UI_SELECTORS.reports.periodSelect, 'weekly');
      await page.click(UI_SELECTORS.reports.generateButton);

      // 等待報告生成
      await page.waitForSelector(UI_SELECTORS.reports.content);

      // 驗證報告內容
      await expect(page.locator(UI_SELECTORS.reports.nutritionSummary)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.reports.medicalInsights)).toBeVisible();
      await expect(page.locator(UI_SELECTORS.reports.foodRecommendations)).toBeVisible();
    });

    await test.step('導出 PDF', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.click(UI_SELECTORS.reports.exportPdf);

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/weekly-report-.*\.pdf/);

      // 驗證文件大小
      const path = await download.path();
      const fs = require('fs');
      const stats = fs.statSync(path);
      expect(stats.size).toBeGreaterThan(1000);
    });

    await test.step('分享報告', async () => {
      await page.click('[data-testid="share-report"]');

      // 測試不同分享選項
      await page.click('[data-testid="share-email"]');
      await page.fill('[data-testid="recipient-email"]', 'doctor@example.com');
      await page.fill('[data-testid="share-message"]', '這是我本週的飲食報告');
      await page.click('[data-testid="send-email"]');

      await expect(page.locator('[data-testid="share-success"]')).toBeVisible();
    });
  });

  test('多設備同步流程', async ({ page }) => {
    // This test requires authenticated user
    await mockAuthenticatedUser(page, 'patient');
    await test.step('在設備 A 添加食物', async () => {
      await testCompleteAteFoodFlow(page, '白米飯', 150, 'g');

      // 觸發同步
      await page.click('[data-testid="sync-now"]');
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
    });

    await test.step('模擬設備 B 同步', async () => {
      // 清除本地數據，模擬另一個設備
      await page.evaluate(() => {
        localStorage.removeItem('food-history');
      });

      // 觸發從雲端同步
      await page.reload();
      await page.click('[data-testid="sync-from-cloud"]');

      // 驗證數據已同步
      await page.click('[data-testid="food-history"]');
      await expect(page.locator('[data-testid="history-item"]')).toContainText('白米飯');
    });

    await test.step('衝突處理', async () => {
      // 模擬同步衝突
      await page.evaluate(() => {
        const conflictData = [{
          id: 'conflict-1',
          food_name: '衝突食物',
          timestamp: new Date().toISOString(),
          source: 'local'
        }];
        localStorage.setItem('sync-conflicts', JSON.stringify(conflictData));
      });

      await page.click('[data-testid="sync-now"]');

      // 處理衝突
      await expect(page.locator('[data-testid="sync-conflicts"]')).toBeVisible();
      await page.click('[data-testid="resolve-keep-local"]');

      await expect(page.locator('[data-testid="conflicts-resolved"]')).toBeVisible();
    });
  });

  test('無障礙功能測試', async ({ page }) => {
    // This test can work without authentication
    await test.step('鍵盤導航', async () => {
      // 測試 Tab 鍵導航
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBeTruthy();

      // 測試 Enter 鍵激活
      await page.keyboard.press('Enter');

      // 繼續導航
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }
    });

    await test.step('螢幕閱讀器支援', async () => {
      // 檢查 ARIA 標籤
      const ariaLabels = await page.$$('[aria-label]');
      expect(ariaLabels.length).toBeGreaterThan(0);

      // 檢查表單標籤
      const labelledInputs = await page.$$('input[aria-labelledby], input[aria-label]');
      const totalInputs = await page.$$('input');
      expect(labelledInputs.length).toBe(totalInputs.length);
    });

    await test.step('高對比度模式', async () => {
      await page.click('[data-testid="accessibility-menu"]');
      await page.click('[data-testid="high-contrast-mode"]');

      // 驗證高對比度樣式已應用
      const bodyClass = await page.getAttribute('body', 'class');
      expect(bodyClass).toContain('high-contrast');
    });

    await test.step('字體大小調整', async () => {
      await page.click('[data-testid="increase-font-size"]');
      await page.click('[data-testid="increase-font-size"]');

      const fontSize = await page.evaluate(() => {
        return window.getComputedStyle(document.documentElement).fontSize;
      });

      expect(fontSize).toMatch(/^(18|20|22)px$/); // 應該比預設大
    });
  });

  test('性能和響應式設計測試', async ({ page }) => {
    // This test can work without authentication
    await test.step('頁面載入性能', async () => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // 3秒內載入
    });

    await test.step('響應式設計 - 手機版', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      // 檢查導航是否變為漢堡菜單
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();

      // 測試手機版搜索
      await page.click('[data-testid="mobile-search"]');
      await page.fill('[data-testid="mobile-search-input"]', '白米');
      await page.press('[data-testid="mobile-search-input"]', 'Enter');

      await expect(page.locator('[data-testid="mobile-search-results"]')).toBeVisible();
    });

    await test.step('響應式設計 - 平板版', async () => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      // 檢查佈局適應
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();

      // 測試觸控手勢 (如果有的話)
      await page.touchscreen.tap(100, 100);
    });

    await test.step('網絡條件測試', async () => {
      // 模擬慢速網絡
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // 100ms 延遲
      });

      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 在慢速網絡下仍應在合理時間內載入
      expect(loadTime).toBeLessThan(5000);
    });
  });
});