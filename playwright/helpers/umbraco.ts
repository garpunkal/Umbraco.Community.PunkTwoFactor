import { Page, Locator, expect } from '@playwright/test';
import jsQR from 'jsqr';
import { extractSecretFromOtpAuthUri, generateTotpCode } from './totp';

export interface UmbracoCredentials {
  username?: string;
  password?: string;
}

export class UmbracoBackofficePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to the Umbraco backoffice login page.
   */
  async goto() {
    await this.page.goto('/umbraco');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Logs in to the Umbraco backoffice.
   */
  async login(creds?: UmbracoCredentials) {
    const username = creds?.username || process.env.UMBRACO_ADMIN_USERNAME || 'admin@example.com';
    const password = creds?.password || process.env.UMBRACO_ADMIN_PASSWORD || 'Password123!';

    await this.goto();

    // Check if already authenticated and at backoffice
    if (this.page.url().includes('/section/') || (await this.page.locator('umb-app-header').isVisible().catch(() => false))) {
      return;
    }

    // Support both standard HTML inputs and Umbraco Lit components (uui-input, etc.)
    const usernameInput = this.page.locator('input[name="username"], uui-input[name="username"] input, input[type="email"], input[autocomplete="username"]').first();
    const passwordInput = this.page.locator('input[name="password"], uui-input-password input, input[type="password"]').first();

    await usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
    await usernameInput.fill(username);

    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill(password);

    // Click submit button
    const submitBtn = this.page.locator('button[type="submit"], uui-button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
    await submitBtn.click();

    // Wait for backoffice to finish loading or 2FA challenge to appear
    await Promise.race([
      this.page.waitForURL(/.*\/section\/.*/, { timeout: 20_000 }),
      this.page.locator('input[name="code"], input[placeholder*="code" i]').waitFor({ state: 'visible', timeout: 20_000 }),
    ]).catch(() => {});
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Completes the 2FA challenge during login.
   */
  async submit2FACode(code: string) {
    // Wait for the 2FA code input field on the challenge screen
    const codeInput = this.page.getByPlaceholder(/code from your authenticator/i)
      .or(this.page.getByRole('textbox', { name: /verification code/i }))
      .or(this.page.locator('input[placeholder*="authenticator" i]'))
      .first();
    await codeInput.waitFor({ state: 'visible', timeout: 10_000 });
    await codeInput.fill(code);

    const verifyBtn = this.page.getByRole('button', { name: /Validate|Verify|Submit/i }).first();
    await verifyBtn.click();

    await this.page.waitForURL(/.*\/section\/.*/, { timeout: 20_000 }).catch(() => {});
  }

  /**
   * Opens the user profile menu/workspace from the top header.
   */
  async openUserProfile() {
    // In Umbraco 14-18, the avatar button in the header is "User profile for <User>"
    const avatar = this.page.getByRole('button', { name: /User profile/i })
      .or(this.page.locator('umb-header-app-profile button'))
      .or(this.page.locator('umb-header-app-profile'))
      .first();
    await avatar.waitFor({ state: 'visible', timeout: 20_000 });
    await this.page.waitForTimeout(500);
    await avatar.click();
  }

  /**
   * Opens the Configure Two-Factor dialog/section.
   */
  async openConfigureTwoFactor() {
    await this.openUserProfile();

    // Look for button or menu item "Configure Two-Factor"
    const configure2FABtn = this.page.getByRole('button', { name: /Configure Two-Factor/i })
      .or(this.page.locator('button:has-text("Configure Two-Factor")'))
      .first();
    await configure2FABtn.waitFor({ state: 'visible', timeout: 15_000 });
    await configure2FABtn.click();
  }

  /**
   * Finds the punkTwoFactor provider row/element.
   */
  getTwoFactorProviderCard(providerLabel = 'Two Factor Authentication'): Locator {
    return this.page.locator(`text=${providerLabel}`).locator('xpath=ancestor::*[contains(@class, "provider") or contains(@class, "card") or self::tr or contains(@class, "item") or contains(@class, "row")][1]');
  }

  /**
   * Decodes the visible 2FA QR code, submits a valid TOTP code, and returns the TOTP secret.
   */
  async enroll2FAFromQr(qrImage?: Locator): Promise<string> {
    const qr = qrImage ?? this.page.locator('img[src*="data:image"]').first();
    await expect(qr).toBeVisible({ timeout: 15_000 });

    const qrDataUrl = await qr.getAttribute('src');
    expect(qrDataUrl).toBeTruthy();

    const pixelData = await this.page.evaluate(async (dataUrl) => {
      return new Promise<{ width: number; height: number; data: number[] }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          resolve({
            width: img.width,
            height: img.height,
            data: Array.from(imgData.data),
          });
        };
        img.onerror = reject;
        img.src = dataUrl!;
      });
    }, qrDataUrl);

    const qrResult = jsQR(new Uint8ClampedArray(pixelData.data), pixelData.width, pixelData.height);
    expect(qrResult?.data).toBeTruthy();

    const secret = extractSecretFromOtpAuthUri(qrResult!.data);
    expect(secret).toBeTruthy();

    // Avoid 30-second TOTP window boundary rollover
    if (Math.floor(Date.now() / 1000) % 30 >= 27) {
      await this.page.waitForTimeout(3500);
    }

    const codeInput = this.page.getByRole('textbox', { name: /verification code/i });
    await codeInput.scrollIntoViewIfNeeded();
    await codeInput.fill(generateTotpCode(secret!));

    const submitBtn = this.page.getByRole('button', { name: 'Save' })
      .or(this.page.getByRole('button', { name: 'Submit' }))
      .or(this.page.locator('uui-button:has-text("Submit")'))
      .last();

    await Promise.all([
      this.page.waitForResponse((res) => res.url().includes('/user/current/2fa/') && res.request().method() === 'POST' && res.status() === 200),
      submitBtn.click(),
    ]);

    return secret!;
  }

  /**
   * Disables the configured 2FA provider using a valid TOTP code and verifies the Enable button returns.
   */
  async disable2FA(secret: string): Promise<void> {
    const disableButton = this.page.locator('button:has-text("Disable"), uui-button:has-text("Disable")').first();
    await expect(disableButton).toBeVisible({ timeout: 15_000 });
    await disableButton.click();

    const disableCodeInput = this.page.locator('input[placeholder*="verification code" i], uui-input[placeholder*="verification code" i] input').first();
    await expect(disableCodeInput).toBeVisible({ timeout: 10_000 });
    await disableCodeInput.fill(generateTotpCode(secret));

    const submitDisableBtn = this.page.getByRole('button', { name: 'Save' })
      .or(this.page.getByRole('button', { name: 'Submit' }))
      .or(this.page.locator('uui-button:has-text("Submit")'))
      .last();
    await submitDisableBtn.click();

    const enableButton = this.page.locator('button:has-text("Enable"), uui-button:has-text("Enable")').first();
    await expect(enableButton).toBeVisible({ timeout: 15_000 });
  }
}
