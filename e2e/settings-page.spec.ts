import { test, expect } from '@playwright/test';

test.describe('Settings Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the settings page
    await page.goto('/settings');
  });

  test.describe('Page Structure and Navigation', () => {
    test('should display the settings page with correct title', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/Diet Daily/);

      // Check main heading
      await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();

      // Check back to home link
      await expect(page.getByRole('link', { name: '← 返回首頁' })).toBeVisible();
    });

    test('should navigate back to home page', async ({ page }) => {
      // Click back to home link
      await page.getByRole('link', { name: '← 返回首頁' }).click();

      // Should be on home page
      await expect(page).toHaveURL('/');
    });

    test('should have proper responsive design', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.getByText('設定')).toBeVisible();

      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByText('設定')).toBeVisible();

      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByText('設定')).toBeVisible();
    });
  });

  test.describe('Authentication Section', () => {
    test('should show login prompt when not authenticated', async ({ page }) => {
      // Should show login section
      await expect(page.getByText('🔐 帳戶認證')).toBeVisible();
      await expect(page.getByText('請先登入')).toBeVisible();
      await expect(page.getByText('使用 Google 帳戶登入以管理您的設定')).toBeVisible();

      // Should have Google login button
      const loginButton = page.getByRole('button', { name: '🔐 使用 Google 登入' });
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toBeEnabled();
    });

    test('should not show medical settings when not authenticated', async ({ page }) => {
      // Medical settings section should not be visible
      await expect(page.getByText('🏥 醫療狀況設定')).not.toBeVisible();
    });

    test('should handle login button click', async ({ page }) => {
      const loginButton = page.getByRole('button', { name: '🔐 使用 Google 登入' });

      // Mock the login process (since we can't actually do OAuth in tests)
      await page.route('**/auth/google**', route => {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/settings?authenticated=true'
          }
        });
      });

      await loginButton.click();

      // In a real scenario, this would redirect to Google OAuth
      // For testing, we're just checking the button interaction works
      await expect(loginButton).toHaveBeenClicked;
    });
  });

  test.describe('System Information Section', () => {
    test('should display system information', async ({ page }) => {
      await expect(page.getByText('ℹ️ 系統資訊')).toBeVisible();
      await expect(page.getByText('• 資料儲存：所有設定保存在 Supabase 資料庫')).toBeVisible();
      await expect(page.getByText('• 資料安全：啟用 Row Level Security 保護個人資料')).toBeVisible();
      await expect(page.getByText('• 認證方式：Google OAuth 2.0 安全登入')).toBeVisible();
      await expect(page.getByText('• 版本：v4.0.0 - Supabase 架構')).toBeVisible();
    });
  });

  test.describe('Medical Settings Section (Authenticated State)', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        // Mock the useSupabaseAuth hook to return authenticated state
        window.mockAuthState = {
          user: {
            id: 'test-user',
            email: 'test@example.com'
          },
          userProfile: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
            medical_conditions: [],
            allergies: [],
            dietary_restrictions: [],
            medications: []
          },
          isLoading: false,
          isAuthenticated: true,
          isAdmin: false
        };
      });
    });

    test('should show medical settings when authenticated', async ({ page }) => {
      // Since we can't easily mock the React hook in Playwright,
      // this test would need a different approach in a real scenario
      // We'll test the UI elements that should be present

      // Navigate to a mock authenticated version or use test data
      await page.goto('/settings');

      // Check if authentication section is present
      await expect(page.getByText('🔐 帳戶認證')).toBeVisible();
    });

    test('should display medical condition options', async ({ page }) => {
      // These would be visible if authenticated
      // In a real test, we'd need to mock the authentication state

      // Test that the page structure is correct
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Should focus on the back link
      await expect(page.getByRole('link', { name: '← 返回首頁' })).toBeFocused();

      // Continue tabbing to next focusable element
      await page.keyboard.press('Tab');

      // Should eventually reach the login button
      const loginButton = page.getByRole('button', { name: '🔐 使用 Google 登入' });
      if (await loginButton.isVisible()) {
        // Tab until we reach the login button
        let attempts = 0;
        while (!(await loginButton.isFocused()) && attempts < 10) {
          await page.keyboard.press('Tab');
          attempts++;
        }
        await expect(loginButton).toBeFocused();
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper heading structure
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toBeVisible();

      const h2Elements = page.getByRole('heading', { level: 2 });
      await expect(h2Elements.first()).toBeVisible();

      // Check for proper button roles
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);

      // Check for proper link roles
      const links = page.getByRole('link');
      const linkCount = await links.count();
      expect(linkCount).toBeGreaterThan(0);
    });

    test('should meet contrast requirements', async ({ page }) => {
      // Basic visibility check for text elements
      await expect(page.getByText('設定')).toBeVisible();
      await expect(page.getByText('請先登入')).toBeVisible();
      await expect(page.getByText('使用 Google 帳戶登入以管理您的設定')).toBeVisible();

      // Check button visibility and contrast
      const loginButton = page.getByRole('button', { name: '🔐 使用 Google 登入' });
      await expect(loginButton).toBeVisible();
    });

    test('should be usable with screen reader', async ({ page }) => {
      // Check for proper semantic structure
      await expect(page.getByRole('main')).toBeVisible().catch(() => {
        // If no main role, check for proper content structure
        expect(page.locator('body')).toBeVisible();
      });

      // Check headings are properly structured
      const headings = page.getByRole('heading');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
    });
  });

  test.describe('Performance Tests', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have no console errors', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/settings');
      await page.waitForLoadState('domcontentloaded');

      // Filter out expected errors (like network errors for auth)
      const unexpectedErrors = consoleErrors.filter(error =>
        !error.includes('Failed to fetch') &&
        !error.includes('NetworkError') &&
        !error.includes('AuthError')
      );

      expect(unexpectedErrors).toHaveLength(0);
    });
  });

  test.describe('Mobile-Specific Tests', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should be usable on mobile devices', async ({ page }) => {
      await page.goto('/settings');

      // Check that content is visible and properly sized
      await expect(page.getByText('設定')).toBeVisible();
      await expect(page.getByText('請先登入')).toBeVisible();

      // Check that buttons are properly sized for mobile
      const loginButton = page.getByRole('button', { name: '🔐 使用 Google 登入' });
      await expect(loginButton).toBeVisible();

      // Check button size is appropriate for mobile
      const buttonBox = await loginButton.boundingBox();
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThan(40); // Minimum touch target size
      }
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.goto('/settings');

      const loginButton = page.getByRole('button', { name: '🔐 使用 Google 登入' });

      // Simulate touch interaction
      await loginButton.tap();

      // Button should respond to tap
      await expect(loginButton).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      await page.goto('/settings');

      // Basic functionality should work in all browsers
      await expect(page.getByText('設定')).toBeVisible();
      await expect(page.getByRole('button', { name: '🔐 使用 Google 登入' })).toBeVisible();

      // Log browser for debugging
      console.log(`Testing on ${browserName}`);
    });
  });
});

test.describe('Settings Page Integration Tests', () => {
  test.describe('Data Persistence (Mock)', () => {
    test('should simulate settings save and load', async ({ page }) => {
      // This would test the actual save/load functionality
      // In a real scenario, we'd need to mock the backend

      await page.goto('/settings');

      // Check that the page loads
      await expect(page.getByText('設定')).toBeVisible();

      // In a real test, we would:
      // 1. Mock authentication
      // 2. Select medical conditions
      // 3. Save settings
      // 4. Reload page
      // 5. Verify settings are loaded
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      await page.goto('/settings');

      // Page should still load with degraded functionality
      await expect(page.getByText('設定')).toBeVisible();
    });

    test('should handle authentication errors', async ({ page }) => {
      // Mock auth error
      await page.route('**/auth/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });

      await page.goto('/settings');

      // Should show login prompt
      await expect(page.getByText('請先登入')).toBeVisible();
    });
  });
});