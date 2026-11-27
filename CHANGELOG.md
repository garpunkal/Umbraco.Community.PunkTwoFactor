# Changelog

All notable changes to `Umbraco.Community.PunkTwoFactor` are documented in this file.

## [Unreleased]
- Removed `.NET 11` / Umbraco 19 from CI workflows and `global.json` on `main`; Umbraco 19 support is developed on the `umbraco-19` branch.

## [18.3.2.11] - 2026-11-27
- Scoped stable NuGet package target to `net10.0` (Umbraco 17 and 18) until Umbraco 19.0.0 GA is released (`NU5104`).

## [18.3.2.10] - 2026-11-27
- Added multi-targeting (`net10.0;net11.0`) to support Umbraco 17, 18, and 19 (RC2+).
- Allowed `GET /umbraco/management/api/v1/user/current/configuration` in `ForceTwoFactorMiddleware` for Umbraco 19 backoffice bootstrap.
- Updated `force-2fa.js` to use `credentials: 'include'` (cookie auth) with optional `getLatestToken()` fallback for Umbraco 18/19 compatibility.

## [18.3.2.9] - 2026-11-27
- Use absolute GitHub raw URLs for screenshots in `README.md` so they render on NuGet.org.

## [18.3.2.8] - 2026-11-27
- Updated Umbraco CMS package references (`Umbraco.Cms.*`) from `18.2.1` to `18.3.2`.
- Updated test and tooling dependencies (`Moq` `4.21.0`, `Microsoft.NET.Test.Sdk` `18.12.0`, `coverlet.collector` `10.1.1`, `typescript` `6.0.3`, `actions/checkout` `v7`, `actions/upload-artifact` `v7`).

## [18.3.2.7] - 2026-11-27
- Fixed `release.yml` `origin/main` ancestry check using full checkout (`fetch-depth: 0`) and `git merge-base`.
- Removed Codecov badge from `README.md`.

## [18.3.2.6] - 2026-11-27
- Changed root namespace and C# namespaces from `punkTwoFactor.*` to `Umbraco.Community.PunkTwoFactor.*`.
- Changed `appsettings.json` configuration section key from `"punkTwoFactor"` to `"Umbraco.Community.PunkTwoFactor"`.
- Renamed solution, projects, repository, and documentation references to `Umbraco.Community.PunkTwoFactor`.
- Changed NuGet `<PackageId>` to `Umbraco.Community.PunkTwoFactor`.
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
