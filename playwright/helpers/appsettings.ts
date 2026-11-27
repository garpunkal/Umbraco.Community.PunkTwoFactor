import * as fs from 'fs';
import * as path from 'path';

const appsettingsPath = path.resolve(__dirname, '../../Umbraco.Community.PunkTwoFactor.Umbraco/appsettings.json');

/**
 * Temporarily merges an `Umbraco.Community.PunkTwoFactor` section into `Umbraco.Community.PunkTwoFactor.Umbraco/appsettings.json`
 * and returns a restore function that reverts the file to its original contents.
 */
export function updatePunkTwoFactorSettings(settings: Record<string, unknown>): () => void {
  const original = fs.readFileSync(appsettingsPath, 'utf-8');
  const parsed = JSON.parse(original);
  parsed['Umbraco.Community.PunkTwoFactor'] = {
    ...(parsed['Umbraco.Community.PunkTwoFactor'] || {}),
    ...settings,
  };
  fs.writeFileSync(appsettingsPath, JSON.stringify(parsed, null, 2), 'utf-8');
  return () => {
    fs.writeFileSync(appsettingsPath, original, 'utf-8');
  };
}
