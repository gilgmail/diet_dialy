/**
 * E2E 測試食物相關輔助工具
 * 提供食物搜索、添加、評分等相關的測試輔助函數
 */

import { Page, expect } from '@playwright/test';
import { TEST_FOODS, UI_SELECTORS } from '../fixtures/test-data';

export interface FoodSearchOptions {
  category?: string;
  verificationStatus?: string;
  limit?: number;
}

export interface FoodEntry {
  name: string;
  portionSize: number;
  unit: string;
  mealType?: string;
  notes?: string;
}

export interface MedicalScoreExpectation {
  condition: string;
  expectedScore: number | string;
  shouldHaveWarning?: boolean;
  shouldHaveRecommendations?: boolean;
}

/**
 * 搜索食物
 */
export async function searchFood(
  page: Page,
  query: string,
  options: FoodSearchOptions = {}
): Promise<void> {
  await page.fill(UI_SELECTORS.food.searchInput, query);
  await page.press(UI_SELECTORS.food.searchInput, 'Enter');

  // 等待搜索結果載入
  await page.waitForSelector(UI_SELECTORS.food.searchResults);

  // 如果有其他篩選選項，應用它們
  if (options.category) {
    await page.selectOption('[data-testid="category-filter"]', options.category);
  }

  if (options.verificationStatus) {
    await page.selectOption('[data-testid="verification-filter"]', options.verificationStatus);
  }
}

/**
 * 選擇搜索結果中的食物
 */
export async function selectFoodFromResults(
  page: Page,
  foodName: string
): Promise<void> {
  await page.click(UI_SELECTORS.food.foodItem(foodName));

  // 等待食物詳細頁面載入
  await page.waitForSelector(UI_SELECTORS.food.medicalScore);
}

/**
 * 驗證醫療評分
 */
export async function verifyMedicalScore(
  page: Page,
  expectation: MedicalScoreExpectation
): Promise<void> {
  const scoreElement = page.locator(UI_SELECTORS.food.medicalScore);

  if (typeof expectation.expectedScore === 'string') {
    await expect(scoreElement).toContainText(expectation.expectedScore);
  } else {
    // 如果是數字分數，檢查分數範圍
    const scoreText = await scoreElement.textContent();
    const scoreMatch = scoreText?.match(/(\d+)/);
    if (scoreMatch) {
      const actualScore = parseInt(scoreMatch[1]);
      expect(actualScore).toBe(expectation.expectedScore);
    }
  }

  // 檢查警告
  if (expectation.shouldHaveWarning) {
    await expect(page.locator(UI_SELECTORS.food.allergyWarning)).toBeVisible();
  }

  // 檢查建議
  if (expectation.shouldHaveRecommendations) {
    await expect(page.locator(UI_SELECTORS.food.recommendations)).toBeVisible();
  }
}

/**
 * 添加食物到日記
 */
export async function addFoodToDiary(
  page: Page,
  entry: FoodEntry
): Promise<void> {
  // 點擊添加到日記按鈕
  await page.click(UI_SELECTORS.food.addToDialy);

  // 設定份量
  await page.fill(UI_SELECTORS.food.portionSize, entry.portionSize.toString());
  await page.selectOption(UI_SELECTORS.food.portionUnit, entry.unit);

  // 設定餐別 (如果有)
  if (entry.mealType) {
    await page.selectOption('[data-testid="meal-type"]', entry.mealType);
  }

  // 添加備註 (如果有)
  if (entry.notes) {
    await page.fill('[data-testid="food-notes"]', entry.notes);
  }

  // 確認添加
  await page.click(UI_SELECTORS.food.confirmAdd);

  // 驗證添加成功
  await expect(page.locator(UI_SELECTORS.food.addSuccess)).toBeVisible();
}

/**
 * 測試完整的食物流程 (搜索 → 選擇 → 驗證評分 → 添加)
 */
export async function testCompleteAteFoodFlow(
  page: Page,
  foodName: string,
  portionSize: number = 100,
  unit: string = 'g'
): Promise<void> {
  // 1. 搜索食物
  await searchFood(page, foodName);

  // 2. 選擇食物
  await selectFoodFromResults(page, foodName);

  // 3. 驗證可以看到醫療評分
  await expect(page.locator(UI_SELECTORS.food.medicalScore)).toBeVisible();

  // 4. 添加到日記
  await addFoodToDiary(page, {
    name: foodName,
    portionSize,
    unit,
  });
}

/**
 * 批量測試多個食物
 */
export async function testMultipleFoods(
  page: Page,
  foods: Array<{ name: string; portionSize?: number; unit?: string }>
): Promise<void> {
  for (const food of foods) {
    await testCompleteAteFoodFlow(
      page,
      food.name,
      food.portionSize || 100,
      food.unit || 'g'
    );

    // 在測試間稍作暫停
    await page.waitForTimeout(1000);
  }
}

/**
 * 驗證過敏警告
 */
export async function verifyAllergyWarning(
  page: Page,
  allergyName: string
): Promise<void> {
  const warningElement = page.locator(UI_SELECTORS.food.allergyWarning);
  await expect(warningElement).toBeVisible();
  await expect(warningElement).toContainText(allergyName);
}

/**
 * 檢查食物建議
 */
export async function checkFoodRecommendations(page: Page): Promise<string[]> {
  const recommendationsElement = page.locator(UI_SELECTORS.food.recommendations);
  await expect(recommendationsElement).toBeVisible();

  const recommendationItems = page.locator('[data-testid="recommendation-item"]');
  const count = await recommendationItems.count();

  const recommendations: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await recommendationItems.nth(i).textContent();
    if (text) {
      recommendations.push(text.trim());
    }
  }

  return recommendations;
}

/**
 * 獲取營養資訊
 */
export async function getNutritionInfo(page: Page): Promise<Record<string, number>> {
  const nutritionSection = page.locator('[data-testid="nutrition-info"]');
  await expect(nutritionSection).toBeVisible();

  const nutrition: Record<string, number> = {};

  // 獲取基本營養素
  const nutrients = ['calories', 'protein', 'fat', 'carbs', 'fiber'];

  for (const nutrient of nutrients) {
    try {
      const element = page.locator(`[data-testid="nutrition-${nutrient}"]`);
      const text = await element.textContent();
      const value = parseFloat(text?.replace(/[^\d.]/g, '') || '0');
      nutrition[nutrient] = value;
    } catch {
      nutrition[nutrient] = 0;
    }
  }

  return nutrition;
}

/**
 * 比較營養值
 */
export async function compareNutritionValues(
  actual: Record<string, number>,
  expected: Record<string, number>,
  tolerance: number = 5
): Promise<void> {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key] || 0;
    const difference = Math.abs(actualValue - expectedValue);
    const percentDifference = (difference / expectedValue) * 100;

    expect(percentDifference).toBeLessThan(tolerance);
  }
}

/**
 * 模擬離線搜索
 */
export async function testOfflineSearch(
  page: Page,
  foodName: string
): Promise<void> {
  // 斷開網絡
  await page.context().setOffline(true);

  // 嘗試搜索 (應該使用緩存)
  await searchFood(page, foodName);

  // 檢查離線指示器
  await expect(page.locator(UI_SELECTORS.offline.indicator)).toBeVisible();

  // 應該仍能找到緩存的結果
  await expect(page.locator(UI_SELECTORS.food.searchResults)).toBeVisible();

  // 重新連線
  await page.context().setOffline(false);
}

/**
 * 清除食物歷史
 */
export async function clearFoodHistory(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('food-history');
  });
}

/**
 * 獲取食物歷史
 */
export async function getFoodHistory(page: Page): Promise<any[]> {
  return await page.evaluate(() => {
    const history = localStorage.getItem('food-history');
    return history ? JSON.parse(history) : [];
  });
}