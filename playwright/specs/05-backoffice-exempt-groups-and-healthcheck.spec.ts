import { test, expect } from '@playwright/test';
import { UmbracoBackofficePage } from '../helpers/umbraco';
import { updatePunkTwoFactorSettings } from '../helpers/appsettings';

test.describe('punkTwoFactor - Exempt Groups & Health Check', () => {
  test('should exempt configured user groups from ForceTwoFactor and expose Health Check', async ({ page }) => {
    const restoreSettings = updatePunkTwoFactorSettings({
      ForceTwoFactor: true,
      ExemptUserGroups: ['admin'],
    });
    const backoffice = new UmbracoBackofficePage(page);

    try {
      await page.waitForTimeout(1500);

      // 1. Log in as admin (member of exempt "admin" group)
      const statusPromise = page.waitForResponse(
        (res) => res.url().includes('/punk-two-factor/status') && res.status() === 200,
      );
      await backoffice.login();

      const statusRes = await statusPromise;
      const statusJson = await statusRes.json();
      expect(statusJson.forceTwoFactor).toBe(false);

      // 2. Verify forced 2FA dialog does NOT appear and backoffice is accessible
      const requiredHeading = page.locator('text=Two-Factor Authentication Required');
      await expect(requiredHeading).toBeHidden({ timeout: 5_000 });

      const userProfileBtn = page.getByRole('button', { name: /User profile/i });
      await expect(userProfileBtn).toBeVisible({ timeout: 15_000 });

      // 3. Navigate to Settings -> Health Check -> Security and verify punkTwoFactor check is registered
      await page.getByRole('tab', { name: 'Settings' }).click();
      await page.getByRole('tab', { name: 'Health Check' }).click();

      const securityGroup = page.locator('text=Security').first();
      await expect(securityGroup).toBeVisible({ timeout: 15_000 });
      await securityGroup.click();

      const healthCheckItem = page.locator('text=Two-Factor Authentication (punkTwoFactor)').first();
      await expect(healthCheckItem).toBeVisible({ timeout: 15_000 });
    } finally {
      restoreSettings();
    }
  });
});
