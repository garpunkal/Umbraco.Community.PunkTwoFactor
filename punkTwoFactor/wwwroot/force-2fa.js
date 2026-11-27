import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { UmbModalToken, umbOpenModal } from '@umbraco-cms/backoffice/modal';
import { UMB_NOTIFICATION_CONTEXT } from '@umbraco-cms/backoffice/notification';

const CURRENT_USER_MFA_MODAL = new UmbModalToken('Umb.Modal.CurrentUserMfa', {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
});

/**
 * Fetches the current two-factor enforcement status from the server.
 * @param {import('@umbraco-cms/backoffice/auth').UmbAuthContext} authContext
 * @returns {Promise<{ forceTwoFactor: boolean, isTwoFactorEnabled: boolean } | null>}
 */
async function fetchTwoFactorStatus(authContext) {
  const token = await authContext.getLatestToken();
  if (!token) {
    return null;
  }

  const response = await fetch('/umbraco/management/api/v1/punk-two-factor/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

export const onInit = (host) => {
  let notificationContext;
  let enforcing = false;

  host.consumeContext(UMB_NOTIFICATION_CONTEXT, (ctx) => {
    notificationContext = ctx;
  });

  host.consumeContext(UMB_AUTH_CONTEXT, (authContext) => {
    if (!authContext) {
      return;
    }

    authContext.isAuthorized.subscribe(async (isAuthorized) => {
      if (!isAuthorized || enforcing) {
        return;
      }

      enforcing = true;
      try {
        let status = await fetchTwoFactorStatus(authContext);
        while (status?.forceTwoFactor && !status.isTwoFactorEnabled && authContext.getIsAuthorized()) {
          await umbOpenModal(host, CURRENT_USER_MFA_MODAL).catch(() => {});

          if (!authContext.getIsAuthorized()) {
            break;
          }

          status = await fetchTwoFactorStatus(authContext);
          if (status?.forceTwoFactor && !status.isTwoFactorEnabled) {
            notificationContext?.peek('warning', {
              data: {
                headline: 'Two-Factor Authentication Required',
                message: 'You must enable two-factor authentication before accessing the backoffice.',
              },
            });
          }
        }
      } catch (err) {
        console.error('[punkTwoFactor] Failed to check forced two-factor status:', err);
      } finally {
        enforcing = false;
      }
    });
  });
};
