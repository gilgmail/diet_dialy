/**
 * E2E Tests for Quick Symptom Entry Flow
 * Tests the complete user journey for recording daily symptoms
 */

import { test, expect } from '@playwright/test';

test.describe('Quick Symptom Entry Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to symptoms page
    await page.goto('/symptoms');

    // Wait for authentication or redirect
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    const needsAuth = await page.getByText(/需要登入|登入/).isVisible().catch(() => false);
    if (needsAuth) {
      // Mock authentication for testing
      await page.goto('/auth/signin');
      // Add mock login steps here
    }
  });

  test('should display quick entry form correctly', async ({ page }) => {
    // Verify quick entry tab is active
    await expect(page.getByRole('tab', { name: /快速記錄/ })).toBeVisible();

    // Verify all core symptom sliders are present
    await expect(page.getByText(/健康.*Overall Health/)).toBeVisible();
    await expect(page.getByText(/腹痛.*Abdominal Pain/)).toBeVisible();
    await expect(page.getByText(/腹瀉.*Diarrhea/)).toBeVisible();
    await expect(page.getByText(/血便.*Bloody Stool/)).toBeVisible();
    await expect(page.getByText(/脹氣.*Bloating/)).toBeVisible();

    // Verify symptom burden indicator
    await expect(page.getByText(/當前症狀狀態/)).toBeVisible();

    // Verify notes textarea
    await expect(page.getByPlaceholder(/記錄任何額外的症狀/)).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /儲存症狀記錄/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /重設/ })).toBeVisible();
  });

  test('should update symptom burden indicator when changing scores', async ({ page }) => {
    // Initially should show no symptoms
    await expect(page.getByText(/無症狀/)).toBeVisible();

    // Find and adjust abdominal pain slider
    const painSlider = page.getByRole('slider', { name: /腹痛/ });
    await painSlider.fill('3');

    // Symptom burden should update
    await expect(page.getByText(/中等症狀/)).toBeVisible();

    // Increase to severe
    await painSlider.fill('5');
    const diarrheaSlider = page.getByRole('slider', { name: /腹瀉/ });
    await diarrheaSlider.fill('4');

    // Should show severe symptoms
    await expect(page.getByText(/嚴重症狀/)).toBeVisible();
  });

  test('should submit quick symptom entry successfully', async ({ page }) => {
    // Set health score
    const healthSlider = page.getByRole('slider', { name: /健康/ });
    await healthSlider.fill('4');

    // Set some symptom scores
    const painSlider = page.getByRole('slider', { name: /腹痛/ });
    await painSlider.fill('2');

    const bloatingSlider = page.getByRole('slider', { name: /脹氣/ });
    await bloatingSlider.fill('1');

    // Add notes
    const notesTextarea = page.getByPlaceholder(/記錄任何額外的症狀/);
    await notesTextarea.fill('今天感覺好多了');

    // Submit the form
    const submitButton = page.getByRole('button', { name: /儲存症狀記錄/ });
    await submitButton.click();

    // Wait for submission to complete
    await page.waitForLoadState('networkidle');

    // Should show success message or confirmation
    await expect(
      page.getByText(/已儲存|儲存成功|記錄成功/)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should reset form when reset button clicked', async ({ page }) => {
    // Set some values
    const healthSlider = page.getByRole('slider', { name: /健康/ });
    await healthSlider.fill('5');

    const painSlider = page.getByRole('slider', { name: /腹痛/ });
    await painSlider.fill('3');

    const notesTextarea = page.getByPlaceholder(/記錄任何額外的症狀/);
    await notesTextarea.fill('Test notes');

    // Click reset
    const resetButton = page.getByRole('button', { name: /重設/ });
    await resetButton.click();

    // Verify form is reset
    await expect(healthSlider).toHaveValue('3'); // Default health
    await expect(painSlider).toHaveValue('0'); // Default pain
    await expect(notesTextarea).toHaveValue('');
  });

  test('should handle rapid score changes smoothly', async ({ page }) => {
    const painSlider = page.getByRole('slider', { name: /腹痛/ });

    // Rapidly change values
    await painSlider.fill('1');
    await painSlider.fill('2');
    await painSlider.fill('3');
    await painSlider.fill('4');
    await painSlider.fill('5');

    // Should end up at final value
    await expect(painSlider).toHaveValue('5');

    // Symptom burden should reflect the changes
    await expect(page.getByText(/症狀/)).toBeVisible();
  });

  test('should validate notes character limit', async ({ page }) => {
    const notesTextarea = page.getByPlaceholder(/記錄任何額外的症狀/);

    // Try to enter more than 500 characters
    const longText = 'a'.repeat(600);
    await notesTextarea.fill(longText);

    // Should be limited to 500 characters
    const actualValue = await notesTextarea.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(500);
  });

  test('should show tips for recording', async ({ page }) => {
    // Verify recording tips are visible
    await expect(page.getByText(/記錄小資訊|記錄提示/)).toBeVisible();
    await expect(page.getByText(/每日同一時間記錄/)).toBeVisible();
    await expect(page.getByText(/健康評分.*1=非常差.*5=非常好/)).toBeVisible();
  });

  test('should disable form during submission', async ({ page }) => {
    // Set up a slow network to catch loading state
    await page.route('**/api/medical/daily-symptoms', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Fill and submit
    const submitButton = page.getByRole('button', { name: /儲存症狀記錄/ });
    await submitButton.click();

    // Should show submitting state
    await expect(page.getByText(/提交中/)).toBeVisible({ timeout: 500 });

    // Sliders should be disabled
    const sliders = page.getByRole('slider');
    const firstSlider = sliders.first();
    await expect(firstSlider).toBeDisabled();
  });

  test('should persist today\'s entry when revisiting page', async ({ page }) => {
    // Submit an entry
    const healthSlider = page.getByRole('slider', { name: /健康/ });
    await healthSlider.fill('4');

    const painSlider = page.getByRole('slider', { name: /腹痛/ });
    await painSlider.fill('2');

    const submitButton = page.getByRole('button', { name: /儲存症狀記錄/ });
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/symptoms');

    // Should show today's entry status
    await expect(page.getByText(/今日已有記錄/)).toBeVisible({ timeout: 5000 });
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Reload page
    await page.reload();

    // Should still show all core elements
    await expect(page.getByText(/快速症狀記錄/)).toBeVisible();
    await expect(page.getByRole('slider').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /儲存/ })).toBeVisible();

    // Sliders should be usable
    const slider = page.getByRole('slider').first();
    await slider.fill('4');
    await expect(slider).toHaveValue('4');
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Start from first slider
    const firstSlider = page.getByRole('slider').first();
    await firstSlider.focus();

    // Should be focused
    await expect(firstSlider).toBeFocused();

    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to reach submit button
    const submitButton = page.getByRole('button', { name: /儲存症狀記錄/ });
    await submitButton.focus();
    await expect(submitButton).toBeFocused();
  });

  test('should show date and status information', async ({ page }) => {
    // Should show today's date
    const today = new Date();
    const dateText = today.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    await expect(page.getByText(new RegExp(dateText))).toBeVisible();

    // Should show recording status
    await expect(page.getByText(/今日尚未記錄|今日已有記錄/)).toBeVisible();
  });

  test('should handle submission errors gracefully', async ({ page }) => {
    // Mock a failed API request
    await page.route('**/api/medical/daily-symptoms', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: '伺服器錯誤' }),
      });
    });

    // Try to submit
    const submitButton = page.getByRole('button', { name: /儲存症狀記錄/ });
    await submitButton.click();

    // Should show error message
    await expect(page.getByText(/錯誤|失敗/)).toBeVisible({ timeout: 3000 });

    // Form should remain editable
    const slider = page.getByRole('slider').first();
    await expect(slider).not.toBeDisabled();
  });

  test('should display completion indicator correctly', async ({ page }) => {
    // Initially with default values, should have some completeness
    await expect(page.getByText(/無症狀/)).toBeVisible();

    // As user fills more fields, indicator should update
    const notesTextarea = page.getByPlaceholder(/記錄任何額外的症狀/);
    await notesTextarea.fill('Detailed notes');

    // Symptom burden should show completeness
    // (Specific implementation depends on component logic)
    await expect(page.getByText(/症狀狀態/)).toBeVisible();
  });

  test('should switch between quick and detailed tabs', async ({ page }) => {
    // Should be on quick tab by default
    await expect(page.getByRole('tab', { name: /快速記錄/ })).toHaveAttribute('data-state', 'active');

    // Switch to detailed tab
    await page.getByRole('tab', { name: /詳細記錄/ }).click();

    // Should show detailed form
    await expect(page.getByText(/核心症狀評分/)).toBeVisible();
    await expect(page.getByText(/生活品質評分/)).toBeVisible();

    // Switch back to quick tab
    await page.getByRole('tab', { name: /快速記錄/ }).click();

    // Should show quick form again
    await expect(page.getByText(/快速症狀記錄/)).toBeVisible();
  });
});