import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 測試配置
 * 針對醫療食品追蹤應用優化
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',

  /* 並行執行測試 */
  fullyParallel: true,

  /* 在 CI 環境中失敗時不重試 */
  forbidOnly: !!process.env.CI,

  /* 失敗時重試次數 */
  retries: process.env.CI ? 2 : 0,

  /* 並行執行的 worker 數量 */
  workers: process.env.CI ? 1 : undefined,

  /* 測試報告格式 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  /* 全局測試配置 */
  use: {
    /* 基礎 URL */
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',

    /* 追蹤模式 */
    trace: 'on-first-retry',

    /* 截圖模式 */
    screenshot: 'only-on-failure',

    /* 影片錄製 */
    video: 'retain-on-failure',

    /* 瀏覽器語言 */
    locale: 'zh-TW',

    /* 時區設定 */
    timezoneId: 'Asia/Taipei',

    /* 忽略 HTTPS 錯誤 */
    ignoreHTTPSErrors: true,

    /* 增加超時時間以提高穩定性 */
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Microsoft Edge */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],

  /* 在開始測試前啟動開發伺服器 */
  webServer: {
    command: process.env.CI
      ? 'npm run start -- --hostname 0.0.0.0 --port 3000'
      : 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* 測試目錄結構 */
  outputDir: 'test-results/',

  /* 全域設定 */
  globalSetup: './src/__tests__/e2e/global-setup.ts',
  globalTeardown: './src/__tests__/e2e/global-teardown.ts',

  /* 測試模式配置 */
  expect: {
    /* 斷言超時時間 */
    timeout: 5000,

    /* 截圖比較閾值 */
    threshold: 0.2,

    /* 像素比較模式 */
    mode: 'default'
  },

  /* 測試超時設定 */
  timeout: 30 * 1000,

  /* 測試重試配置 */
  maxFailures: process.env.CI ? 10 : undefined,
});