# Copilot Instructions for Umbraco.Community.PunkTwoFactor

## Repository Overview
- **`Umbraco.Community.PunkTwoFactor/`**: Umbraco 18+ (.NET 10) Two-Factor Authentication package (`Umbraco.Community.PunkTwoFactor.csproj`, `Umbraco.Community.PunkTwoFactor.slnx`).
- **`Umbraco.Community.PunkTwoFactor.Tests/`**: xUnit + Moq unit tests with Coverlet code coverage.
- **`Umbraco.Community.PunkTwoFactor.Umbraco/`**: Local Umbraco 18 test site used for manual verification and Playwright E2E tests.
- **`playwright/`**: Playwright E2E test suite (`npm test`, `npm run typecheck`, `npm run lint`).

## Rules & Conventions
- **Always update `CHANGELOG.md`:** Add entries under `## [Unreleased]` for new changes, and move them under the version heading when tagging a release.
- **Keep versions in sync:** When bumping the version, update both `<Version>` in `Umbraco.Community.PunkTwoFactor/Umbraco.Community.PunkTwoFactor.csproj` and `"version"` in `Umbraco.Community.PunkTwoFactor/wwwroot/umbraco-package.json`. Release tags follow `v<major>.<minor>.<patch>` or `v<major>.<minor>.<patch>.<build>`.
- **Keep `ForceTwoFactor` disabled by default in `Umbraco.Community.PunkTwoFactor.Umbraco`:** Do not commit `"ForceTwoFactor": true` in `Umbraco.Community.PunkTwoFactor.Umbraco/appsettings.json` or `Umbraco.Community.PunkTwoFactor.Umbraco/appsettings.Development.json`. Playwright specs `01`–`03` expect it to be `false`; specs `04` and `05` toggle it temporarily via `playwright/helpers/appsettings.ts`.
- **Backoffice-only scope:** `Umbraco.Community.PunkTwoFactor` targets Umbraco backoffice users (`BackOfficeIdentityBuilder`, `IBackOfficeSecurityAccessor`, `IOptionsMonitor<TwoFactorConfig>`).
- **Formatting:** Follow `.editorconfig` rules.

## Verification
Before committing or tagging a release, verify:
1. `dotnet build --configuration Release`
2. `dotnet test Umbraco.Community.PunkTwoFactor.Tests --configuration Release`
3. In `playwright/`: `npm run typecheck`, `npm run lint`, and `npm test`
