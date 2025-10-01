/**
 * Playwright 全域設定
 * 在所有測試開始前執行的設定工作
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // 設定測試環境變數
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

  // 創建測試瀏覽器實例進行初始設定
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 等待應用啟動
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 驗證應用基本功能
    console.log('✅ Application is ready');

    // 設定測試數據或執行其他初始化工作
    await page.evaluate(() => {
      // 清除任何現有的本地存儲
      localStorage.clear();
      sessionStorage.clear();

      // 設定測試標記
      localStorage.setItem('e2e-test-mode', 'true');
    });

    console.log('🎯 Test environment setup completed');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;