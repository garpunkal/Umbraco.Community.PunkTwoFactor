import { test, expect } from '@playwright/test';
import { UmbracoBackofficePage } from '../helpers/umbraco';
import { saveTestState } from '../helpers/state';

test.describe('punkTwoFactor - Setup Flow', () => {
  test('should display punkTwoFactor provider and successfully enable 2FA', async ({ page }) => {
    const backoffice = new UmbracoBackofficePage(page);

    // 1. Log in to Umbraco backoffice
    await backoffice.login();

    // 2. Open User Profile -> Configure Two-Factor
    await backoffice.openConfigureTwoFactor();

    // 3. Verify punkTwoFactor provider ("Two Factor Authentication") is listed
    const providerHeader = page.locator('text=Two Factor Authentication').first();
    await expect(providerHeader).toBeVisible({ timeout: 15_000 });

    // 4. Click Enable on Two Factor Authentication
    const enableButton = page.locator('button:has-text("Enable"), uui-button:has-text("Enable")').first();
    await expect(enableButton).toBeVisible();
    await enableButton.click();

    // 5. Decode QR code, submit TOTP code, and persist secret for login/disable specs
    const capturedSecret = await backoffice.enroll2FAFromQr();
    saveTestState({
      totpSecret: capturedSecret,
      enrolledUsername: process.env.UMBRACO_ADMIN_USERNAME || 'admin@example.com',
    });

    // 6. Close recovery/confirmation step if shown and verify provider shows "Disable"
    const closeOrDoneBtn = page.locator('dialog').last().getByRole('button', { name: /Close|Done|Confirm/i }).first();
    if (await closeOrDoneBtn.isVisible().catch(() => false)) {
      await closeOrDoneBtn.click();
    }

    const disableButton = page.locator('button:has-text("Disable"), uui-button:has-text("Disable")').first();
    await expect(disableButton).toBeVisible({ timeout: 15_000 });
  });
});
