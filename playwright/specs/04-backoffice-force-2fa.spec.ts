import { test, expect } from '@playwright/test';
import { UmbracoBackofficePage } from '../helpers/umbraco';
import { updatePunkTwoFactorSettings } from '../helpers/appsettings';

test.describe('punkTwoFactor - Forced 2FA Flow', () => {
  test('should force 2FA setup on login when ForceTwoFactor is true and hide Disable while enabled', async ({ page }) => {
    test.setTimeout(120_000);
    const restoreSettings = updatePunkTwoFactorSettings({ ForceTwoFactor: true });
    const backoffice = new UmbracoBackofficePage(page);

    try {
      await page.waitForTimeout(1500);

      // 1. Log in to Umbraco backoffice (user has no 2FA yet)
      await backoffice.login();

      // 2. Verify the "Two-Factor Authentication Required" dialog opens automatically
      const requiredHeading = page.locator('text=Two-Factor Authentication Required').first();
      await expect(requiredHeading).toBeVisible({ timeout: 20_000 });
      if (process.env.CAPTURE_SCREENSHOTS === 'true') {
        await page.waitForTimeout(300);
        await page.screenshot({ path: '../screenshots/force-2fa-modal.png' });
      }

      const setupBtn = page.getByRole('button', { name: 'Set Up Two-Factor Authentication' });
      await expect(setupBtn).toBeVisible({ timeout: 10_000 });
      await setupBtn.click();

      // 3. Goes straight to QR setup; closing without enabling re-opens the required dialog
      const qrImage = page.locator('img[src*="data:image"]').first();
      await expect(qrImage).toBeVisible({ timeout: 15_000 });

      const closeBtn = page.getByRole('button', { name: 'Close' }).last();
      await expect(closeBtn).toBeVisible({ timeout: 10_000 });
      await closeBtn.click();

      await expect(requiredHeading).toBeVisible({ timeout: 15_000 });
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/user/current/2fa/') && res.request().method() === 'GET' && res.status() === 200),
        setupBtn.click(),
      ]);

      // 4. Enroll 2FA from the fresh QR code
      const totpSecret = await backoffice.enroll2FAFromQr(page.locator('img[src*="data:image"]').last());

      const closeAfterEnable = page.getByRole('button', { name: /Close|Done/i }).last();
      if (await closeAfterEnable.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeAfterEnable.click();
      }
      await expect(requiredHeading).toBeHidden({ timeout: 15_000 });

      // 5. Verify Disable button is hidden while ForceTwoFactor is true
      await backoffice.openConfigureTwoFactor();
      const disableButton = page.locator('button:has-text("Disable"), uui-button:has-text("Disable")').first();
      await expect(disableButton).toBeHidden({ timeout: 10_000 });

      // 6. Toggle ForceTwoFactor back off and verify user can disable 2FA
      restoreSettings();
      await page.waitForTimeout(2000);
      await page.goto('/umbraco');
      await page.waitForLoadState('domcontentloaded');

      await backoffice.openConfigureTwoFactor();
      await backoffice.disable2FA(totpSecret);
    } finally {
      restoreSettings();
    }
  });
});
