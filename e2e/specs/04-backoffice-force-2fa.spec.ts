import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import jsQR from 'jsqr';
import { UmbracoBackofficePage } from '../helpers/umbraco';
import { generateTotpCode, extractSecretFromOtpAuthUri } from '../helpers/totp';

const appsettingsPath = path.resolve(__dirname, '../../UmbracoTestSite/appsettings.json');

test.describe('punkTwoFactor - Forced 2FA Flow', () => {
  test('should force 2FA setup on login when ForceTwoFactor is true and block disabling while enabled', async ({ page }) => {
    const originalAppsettings = fs.readFileSync(appsettingsPath, 'utf-8');
    const parsed = JSON.parse(originalAppsettings);
    parsed.punkTwoFactor = {
      ...(parsed.punkTwoFactor || {}),
      ForceTwoFactor: true,
    };

    let totpSecret: string | null = null;
    const backoffice = new UmbracoBackofficePage(page);

    try {
      // Enable ForceTwoFactor dynamically (IOptionsMonitor reloads appsettings.json)
      fs.writeFileSync(appsettingsPath, JSON.stringify(parsed, null, 2), 'utf-8');
      await page.waitForTimeout(1000);

      // 1. Log in to Umbraco backoffice (user has no 2FA yet)
      await backoffice.login();

      // 2. Verify the Configure Two-Factor modal opens automatically without clicking User Profile
      const providerHeader = page.locator('text=Two Factor Authentication').first();
      await expect(providerHeader).toBeVisible({ timeout: 20_000 });

      // 3. Try closing the modal without enabling 2FA -> it should re-open
      const closeBtn = page.getByRole('button', { name: 'Close' }).last();
      await expect(closeBtn).toBeVisible({ timeout: 10_000 });
      await closeBtn.click();

      await expect(providerHeader).toBeVisible({ timeout: 15_000 });

      // 4. Enable 2FA via the forced modal
      const enableButton = page.locator('button:has-text("Enable"), uui-button:has-text("Enable")').first();
      await expect(enableButton).toBeVisible({ timeout: 10_000 });
      await enableButton.click();

      const qrImage = page.locator('img[src*="data:image"]').first();
      await expect(qrImage).toBeVisible({ timeout: 15_000 });
      const qrDataUrl = await qrImage.getAttribute('src');
      expect(qrDataUrl).toBeTruthy();

      const pixelData = await page.evaluate(async (dataUrl) => {
        return new Promise<{ width: number; height: number; data: number[] }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, img.width, img.height);
            resolve({ width: img.width, height: img.height, data: Array.from(imgData.data) });
          };
          img.onerror = reject;
          img.src = dataUrl!;
        });
      }, qrDataUrl);

      const qrResult = jsQR(new Uint8ClampedArray(pixelData.data), pixelData.width, pixelData.height);
      expect(qrResult?.data).toBeTruthy();
      totpSecret = extractSecretFromOtpAuthUri(qrResult!.data);
      expect(totpSecret).toBeTruthy();

      const codeInput = page.getByRole('textbox', { name: /verification code/i });
      await codeInput.scrollIntoViewIfNeeded();
      await codeInput.fill(generateTotpCode(totpSecret!));

      const submitBtn = page.getByRole('button', { name: 'Save' })
        .or(page.getByRole('button', { name: 'Submit' }))
        .or(page.locator('uui-button:has-text("Submit")'))
        .last();
      await submitBtn.click();

      // 5. Verify provider now shows "Disable", and attempting to disable is blocked (403) while ForceTwoFactor is true
      const disableButton = page.locator('button:has-text("Disable"), uui-button:has-text("Disable")').first();
      await expect(disableButton).toBeVisible({ timeout: 15_000 });
      await disableButton.click();

      const disableCodeInput = page.locator('input[placeholder*="verification code" i], uui-input[placeholder*="verification code" i] input').first();
      await expect(disableCodeInput).toBeVisible({ timeout: 10_000 });
      await disableCodeInput.fill(generateTotpCode(totpSecret!));

      const [disableResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/user/current/2fa/') && res.request().method() === 'DELETE'),
        page.getByRole('button', { name: 'Save' })
          .or(page.getByRole('button', { name: 'Submit' }))
          .or(page.locator('uui-button:has-text("Submit")'))
          .last()
          .click(),
      ]);
      expect(disableResponse.status()).toBe(403);

      // Close disable modal and MFA modal now that 2FA is enabled
      const closeDisableBtn = page.getByRole('button', { name: 'Close' }).last();
      if (await closeDisableBtn.isVisible().catch(() => false)) {
        await closeDisableBtn.click();
      }
      const closeMfaBtn = page.getByRole('button', { name: 'Close' }).last();
      if (await closeMfaBtn.isVisible().catch(() => false)) {
        await closeMfaBtn.click();
      }

      // 6. Toggle ForceTwoFactor back off and verify user can now disable 2FA
      fs.writeFileSync(appsettingsPath, originalAppsettings, 'utf-8');
      await page.waitForTimeout(1000);

      await backoffice.openConfigureTwoFactor();
      await expect(disableButton).toBeVisible({ timeout: 15_000 });
      await disableButton.click();

      await expect(disableCodeInput).toBeVisible({ timeout: 10_000 });
      await disableCodeInput.fill(generateTotpCode(totpSecret!));

      await page.getByRole('button', { name: 'Save' })
        .or(page.getByRole('button', { name: 'Submit' }))
        .or(page.locator('uui-button:has-text("Submit")'))
        .last()
        .click();

      const enableButtonAfter = page.locator('button:has-text("Enable"), uui-button:has-text("Enable")').first();
      await expect(enableButtonAfter).toBeVisible({ timeout: 15_000 });
    } finally {
      fs.writeFileSync(appsettingsPath, originalAppsettings, 'utf-8');
    }
  });
});
