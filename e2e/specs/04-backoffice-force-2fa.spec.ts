import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import jsQR from 'jsqr';
import { UmbracoBackofficePage } from '../helpers/umbraco';
import { generateTotpCode, extractSecretFromOtpAuthUri } from '../helpers/totp';

const appsettingsPath = path.resolve(__dirname, '../../UmbracoTestSite/appsettings.json');

test.describe('punkTwoFactor - Forced 2FA Flow', () => {
  test('should force 2FA setup on login when ForceTwoFactor is true and block disabling while enabled', async ({ page }) => {
    test.setTimeout(120_000);
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

      // 2. Verify the "Two-Factor Authentication Required" dialog opens automatically
      const requiredHeading = page.locator('text=Two-Factor Authentication Required').first();
      await expect(requiredHeading).toBeVisible({ timeout: 20_000 });

      const setupBtn = page.getByRole('button', { name: 'Set Up Two-Factor Authentication' });
      await expect(setupBtn).toBeVisible({ timeout: 10_000 });
      await setupBtn.click();

      // 3. Goes straight to the QR code setup screen; closing it without enabling re-opens the required dialog
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
      const qrImageLast = page.locator('img[src*="data:image"]').last();
      await expect(qrImageLast).toBeVisible({ timeout: 15_000 });

      // 4. Read QR code and submit verification code
      const qrDataUrl = await qrImageLast.getAttribute('src');
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
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/user/current/2fa/') && res.request().method() === 'POST' && res.status() === 200),
        submitBtn.click(),
      ]);

      // Close any remaining modal if still open
      const closeAfterEnable = page.getByRole('button', { name: /Close|Done/i }).last();
      if (await closeAfterEnable.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeAfterEnable.click();
      }
      await page.waitForTimeout(500);

      // 5. Open Configure Two-Factor and verify the Disable button is hidden while ForceTwoFactor is true
      await backoffice.openConfigureTwoFactor();
      const disableButton = page.locator('button:has-text("Disable"), uui-button:has-text("Disable")').first();
      await expect(disableButton).toBeHidden({ timeout: 10_000 });

      const closeMfaBtn = page.getByRole('button', { name: 'Close' }).last();
      if (await closeMfaBtn.isVisible().catch(() => false)) {
        await closeMfaBtn.click();
      }

      // 6. Toggle ForceTwoFactor back off and verify user can now see Disable and disable 2FA
      fs.writeFileSync(appsettingsPath, originalAppsettings, 'utf-8');
      await page.waitForTimeout(1000);

      await backoffice.openConfigureTwoFactor();
      await expect(disableButton).toBeVisible({ timeout: 15_000 });
      await disableButton.click();

      const disableCodeInput = page.locator('input[placeholder*="verification code" i], uui-input[placeholder*="verification code" i] input').first();
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
