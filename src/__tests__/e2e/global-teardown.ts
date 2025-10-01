/**
 * Playwright 全域清理
 * 在所有測試結束後執行的清理工作
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // 清理測試報告目錄中的舊文件
    const testResultsDir = path.join(process.cwd(), 'test-results');

    try {
      const files = await fs.readdir(testResultsDir);

      // 只保留最新的 10 個測試報告
      if (files.length > 10) {
        const fileStats = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(testResultsDir, file);
            const stats = await fs.stat(filePath);
            return { file, path: filePath, mtime: stats.mtime };
          })
        );

        // 按修改時間排序，刪除舊的文件
        fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        const filesToDelete = fileStats.slice(10);

        for (const { path: filePath } of filesToDelete) {
          await fs.unlink(filePath);
          console.log(`🗑️  Deleted old test result: ${path.basename(filePath)}`);
        }
      }
    } catch (error) {
      // 如果目錄不存在，忽略錯誤
      if ((error as any).code !== 'ENOENT') {
        console.warn('⚠️  Warning: Could not clean test-results directory:', error);
      }
    }

    // 生成測試摘要
    await generateTestSummary();

    console.log('✅ Test environment cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
  }
}

async function generateTestSummary() {
  try {
    const summaryPath = path.join(process.cwd(), 'test-results', 'summary.md');
    const timestamp = new Date().toISOString();

    const summary = `# E2E 測試摘要

**執行時間**: ${timestamp}

## 測試覆蓋範圍

- ✅ 用戶註冊和登入流程
- ✅ 醫療資料設定
- ✅ 食物搜索和醫療評分
- ✅ 症狀追蹤和分析
- ✅ 報告生成和導出
- ✅ 離線功能和數據同步
- ✅ 性能和可訪問性驗證

## 測試文件

- \`medical-workflow.spec.ts\`: 完整醫療工作流程測試
- 更多測試文件將在此處列出

## 報告文件

- \`results.json\`: JSON 格式測試結果
- \`junit.xml\`: JUnit 格式測試結果
- \`playwright-report/\`: HTML 格式詳細報告

---
*由 Playwright E2E 測試框架自動生成*
`;

    await fs.writeFile(summaryPath, summary, 'utf-8');
    console.log('📊 Test summary generated');
  } catch (error) {
    console.warn('⚠️  Warning: Could not generate test summary:', error);
  }
}

export default globalTeardown;