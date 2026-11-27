import { test } from '@playwright/test';
import { UmbracoBackofficePage } from '../helpers/umbraco';
import { generateTotpCode } from '../helpers/totp';
import { getTestState, clearTestState } from '../helpers/state';

test.describe('punkTwoFactor - Disable Flow', () => {
  test('should allow disabling 2FA with verification code and revert provider status', async ({ page }) => {
    const state = getTestState();
    const backoffice = new UmbracoBackofficePage(page);

    // 1. Log in with username and password
    await backoffice.login({
      username: state.enrolledUsername || process.env.UMBRACO_ADMIN_USERNAME,
    });

    // Complete 2FA challenge if present
    const validateBtn = page.getByRole('button', { name: 'Validate' });
    if (await validateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      if (state.totpSecret) {
        const codeInput = page.locator('#mfacode input, input[name="token"], uui-input input').first();
        await codeInput.fill(generateTotpCode(state.totpSecret));
        await validateBtn.click();
        await page.waitForURL(/.*\/section\/.*/, { timeout: 20_000 }).catch(() => {});
      }
    }

    // 2. Open Configure Two-Factor and disable 2FA
    await backoffice.openConfigureTwoFactor();
    await backoffice.disable2FA(state.totpSecret!);

    clearTestState();
  });
});
