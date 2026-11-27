# Changelog

All notable changes to `punkTwoFactor` are documented in this file.

## [Unreleased]
- Updated screenshots in `screenshots/`, `README.md`, and `umbraco-marketplace.json` with live Umbraco 18 Playwright captures.

## [18.3.2.5] - 2026-11-27
- Renamed `UmbracoTestSite` to `punkTwoFactor.Umbraco`.
- Parallelized GitHub Actions CI and release workflows and added `.github/copilot-instructions.md`.

## [18.3.2.4] - 2026-11-27
- Added `.slnx` solution format, xUnit unit tests (`punkTwoFactor.Tests`), `.editorconfig`, ESLint, TypeScript checks, Codecov, Gitleaks, and Dependabot.
- Added `ExemptUserGroups` configuration option to exempt specific Umbraco user group aliases from `ForceTwoFactor`.
- Added Umbraco Health Check (`punkTwoFactor`) under **Settings → Health Check**.
- Added NuGet symbol packages (`.snupkg`), SourceLink, and XML documentation generation.
- Added `05-backoffice-exempt-groups-and-healthcheck.spec.ts` and shared Playwright helpers.

## [18.3.2.3] - 2026-11-27
- Hardened Playwright E2E test for `ForceTwoFactor` toggle in CI.

## [18.3.2] - 2026-11-27
- Added **"Two-Factor Authentication Required"** dialog that navigates directly to QR code setup.
- Added blurred/dimmed backoffice backdrop while forced 2FA setup is active.
- Hidden **Disable** button in the backoffice UI while `ForceTwoFactor` is `true`.

## [18.1.0] - 2026-11-27
- Added toggleable `ForceTwoFactor` configuration and server-side Management API enforcement (`403 Forbidden`).

## [18.0.0]
- Initial Umbraco 18 (.NET 10) release using Umbraco's native MFA components.
