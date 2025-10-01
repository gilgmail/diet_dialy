/**
 * E2E 測試認證輔助工具
 * 提供登入、註冊等認證相關的測試輔助函數
 */

import { Page, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data';
import { UI_SELECTORS, waitForNavigation, elementExists } from '../selectors/ui-selectors';

export interface UserCredentials {
  email: string;
  password: string;
}

export interface MedicalProfile {
  medicalConditions: string[];
  allergies: string[];
}

/**
 * 用戶註冊流程
 */
export async function registerUser(
  page: Page,
  credentials: UserCredentials,
  medicalProfile?: MedicalProfile
): Promise<void> {
  // 導航到註冊頁面
  await page.goto('/onboarding');
  await waitForPageLoad(page);

  // 檢查是否已在註冊頁面，如果不是則點擊註冊按鈕
  const isOnSignupPage = await elementExists(page, UI_SELECTORS.auth.emailInput);
  if (!isOnSignupPage) {
    // 尋找註冊按鈕或連結
    const signupButton = await elementExists(page, '[data-testid="get-started-button"]');
    if (signupButton) {
      await page.click('[data-testid="get-started-button"]');
      await waitForNavigation(page, '/onboarding');
    }
  }

  // 填寫註冊表單
  await page.fill(UI_SELECTORS.auth.emailInput, credentials.email);
  await page.fill(UI_SELECTORS.auth.passwordInput, credentials.password);
  await page.fill(UI_SELECTORS.auth.confirmPasswordInput, credentials.password);
  await page.click(UI_SELECTORS.auth.submitButton);

  // 等待註冊完成
  await expect(page.locator(UI_SELECTORS.auth.successMessage)).toBeVisible({ timeout: 30000 });

  // 如果提供了醫療資料，則設定醫療檔案
  if (medicalProfile) {
    await setupMedicalProfile(page, medicalProfile);
  }
}

/**
 * 用戶登入流程
 */
export async function loginUser(
  page: Page,
  credentials: UserCredentials
): Promise<void> {
  await page.goto('/');
  await page.click(UI_SELECTORS.auth.loginButton);

  await page.fill(UI_SELECTORS.auth.emailInput, credentials.email);
  await page.fill(UI_SELECTORS.auth.passwordInput, credentials.password);
  await page.click(UI_SELECTORS.auth.loginSubmit);

  // 等待登入完成
  await expect(page.locator(UI_SELECTORS.auth.welcomeMessage)).toBeVisible();
}

/**
 * 用戶登出
 */
export async function logoutUser(page: Page): Promise<void> {
  await page.click(UI_SELECTORS.auth.logoutButton);

  // 驗證已登出
  await expect(page.locator(UI_SELECTORS.auth.loginButton)).toBeVisible();
}

/**
 * 設定醫療檔案
 */
export async function setupMedicalProfile(
  page: Page,
  profile: MedicalProfile
): Promise<void> {
  // 導航到醫療設定頁面 (可能已經在該頁面或需要導航)
  const onMedicalSetup = await elementExists(page, UI_SELECTORS.medicalSetup.wizard);
  if (!onMedicalSetup) {
    await page.goto('/medical-setup');
    await waitForPageLoad(page);
  }

  // 等待醫療設定嚮導載入
  await expect(page.locator(UI_SELECTORS.medicalSetup.wizard)).toBeVisible();

  // 選擇醫療條件 (假設 IBD、IBS 等是條件 ID)
  for (const condition of profile.medicalConditions) {
    const conditionSelector = UI_SELECTORS.medicalSetup.conditionCheckbox(condition);
    const conditionExists = await elementExists(page, conditionSelector);
    if (conditionExists) {
      await page.check(conditionSelector);
    }
  }

  // 前進到下一步
  await page.click(UI_SELECTORS.medicalSetup.nextStep);

  // 設定過敏原
  for (const allergy of profile.allergies) {
    await page.fill(UI_SELECTORS.medicalSetup.allergyInput, allergy);
    await page.click(UI_SELECTORS.medicalSetup.addAllergyButton);
  }

  // 前進到下一步
  await page.click(UI_SELECTORS.medicalSetup.nextStep);

  // 跳過個人資料設定或填寫基本資料
  const ageInput = await elementExists(page, UI_SELECTORS.medicalSetup.ageInput);
  if (ageInput) {
    await page.fill(UI_SELECTORS.medicalSetup.ageInput, '30');
    await page.selectOption(UI_SELECTORS.medicalSetup.genderSelect, 'other');
  }

  // 完成設定
  await page.click(UI_SELECTORS.medicalSetup.completeSetup);

  // 驗證設定完成
  await expect(page.locator(UI_SELECTORS.medicalSetup.completion)).toBeVisible({ timeout: 30000 });
}

/**
 * 驗證醫療檔案設定
 */
export async function verifyMedicalProfile(
  page: Page,
  profile: MedicalProfile
): Promise<void> {
  // 檢查醫療條件
  for (const condition of profile.medicalConditions) {
    await expect(page.locator(UI_SELECTORS.medical.activeCondition(condition))).toBeVisible();
  }

  // 檢查過敏原
  for (const allergy of profile.allergies) {
    await expect(page.locator(UI_SELECTORS.medical.activeAllergy(allergy))).toBeVisible();
  }
}

/**
 * 模擬已認證用戶 (繞過註冊流程)
 */
export async function mockAuthenticatedUser(
  page: Page,
  userType: keyof typeof TEST_USERS = 'patient'
): Promise<void> {
  const user = TEST_USERS[userType];

  await page.evaluate((userData) => {
    // 設定模擬的認證狀態
    localStorage.setItem('auth-token', 'mock-jwt-token');
    localStorage.setItem('user-profile', JSON.stringify({
      id: 'test-user-id',
      email: userData.email,
      medicalConditions: userData.medicalConditions,
      allergies: userData.allergies,
      profile: userData.profile,
    }));

    // 設定模擬的醫療檔案
    localStorage.setItem('medical-profile', JSON.stringify({
      conditions: userData.medicalConditions,
      allergies: userData.allergies,
      setupComplete: true,
    }));
  }, user);

  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * 清除認證狀態
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-profile');
    localStorage.removeItem('medical-profile');
    sessionStorage.clear();
  });
}

/**
 * 檢查認證狀態
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!localStorage.getItem('auth-token');
  });
}

/**
 * 設定測試用戶歷史數據
 */
export async function setupUserHistory(page: Page): Promise<void> {
  await page.evaluate(() => {
    const mockFoodHistory = [
      {
        id: '1',
        food_name: '白米飯',
        portion_size: 100,
        created_at: new Date().toISOString(),
        medical_score: 4,
        meal_type: 'lunch',
      },
      {
        id: '2',
        food_name: '高纖維蔬菜',
        portion_size: 80,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        medical_score: 2,
        meal_type: 'dinner',
      },
      {
        id: '3',
        food_name: '深海魚',
        portion_size: 120,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        medical_score: 5,
        meal_type: 'dinner',
      },
    ];

    localStorage.setItem('food-history', JSON.stringify(mockFoodHistory));
  });
}

/**
 * 等待頁面完全載入
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');

  // 等待任何載入指示器消失
  try {
    await page.waitForSelector('[data-testid="loading"]', {
      state: 'hidden',
      timeout: 5000
    });
  } catch {
    // 如果沒有載入指示器，繼續
  }
}

/**
 * 處理認證錯誤
 */
export async function handleAuthError(page: Page): Promise<string | null> {
  try {
    const errorMessage = await page.locator('[data-testid="auth-error"]').textContent({ timeout: 2000 });
    return errorMessage;
  } catch {
    return null;
  }
}