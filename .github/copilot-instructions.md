# Copilot Instructions for punkTwoFactor

## Repository Overview
- **`punkTwoFactor/`**: Umbraco 18+ (.NET 10) Two-Factor Authentication package (`punkTwoFactor.csproj`, `punkTwoFactor.slnx`).
- **`punkTwoFactor.Tests/`**: xUnit + Moq unit tests with Coverlet code coverage.
- **`punkTwoFactor.Umbraco/`**: Local Umbraco 18 test site used for manual verification and Playwright E2E tests.
- **`playwright/`**: Playwright E2E test suite (`npm test`, `npm run typecheck`, `npm run lint`).

## Rules & Conventions
- **Always update `CHANGELOG.md`:** Add entries under `## [Unreleased]` for new changes, and move them under the version heading when tagging a release.
- **Keep versions in sync:** When bumping the version, update both `<Version>` in `punkTwoFactor/punkTwoFactor.csproj` and `"version"` in `punkTwoFactor/wwwroot/umbraco-package.json`. Release tags follow `v<major>.<minor>.<patch>` or `v<major>.<minor>.<patch>.<build>`.
- **Keep `ForceTwoFactor` disabled by default in `punkTwoFactor.Umbraco`:** Do not commit `"ForceTwoFactor": true` in `punkTwoFactor.Umbraco/appsettings.json` or `punkTwoFactor.Umbraco/appsettings.Development.json`. Playwright specs `01`–`03` expect it to be `false`; specs `04` and `05` toggle it temporarily via `playwright/helpers/appsettings.ts`.
- **Backoffice-only scope:** `punkTwoFactor` targets Umbraco backoffice users (`BackOfficeIdentityBuilder`, `IBackOfficeSecurityAccessor`, `IOptionsMonitor<TwoFactorConfig>`).
- **Formatting:** Follow `.editorconfig` rules.

## Verification
Before committing or tagging a release, verify:
1. `dotnet build --configuration Release`
2. `dotnet test punkTwoFactor.Tests --configuration Release`
3. In `playwright/`: `npm run typecheck`, `npm run lint`, and `npm test`
