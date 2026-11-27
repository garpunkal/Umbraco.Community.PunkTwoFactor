import { UMB_AUTH_CONTEXT } from '@umbraco-cms/backoffice/auth';
import { html, css } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement, UmbModalToken, umbOpenModal } from '@umbraco-cms/backoffice/modal';

const CURRENT_USER_MFA_MODAL = new UmbModalToken('Umb.Modal.CurrentUserMfa', {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
});

const CURRENT_USER_MFA_ENABLE_MODAL = new UmbModalToken('Umb.Modal.CurrentUserMfaEnableProvider', {
  modal: {
    type: 'sidebar',
    size: 'small',
  },
});

const FORCE_MFA_MODAL = new UmbModalToken('punkTwoFactor.ForceMfaModal', {
  modal: {
    type: 'dialog',
    size: 'small',
  },
});

class PunkForce2faModalElement extends UmbModalBaseElement {
  static styles = css`
    p {
      margin: 0 0 var(--uui-size-space-4, 12px) 0;
      line-height: 1.5;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    const modalEl = this.closest('uui-modal-dialog') ?? this.parentElement;
    const dialogRoot = modalEl?.shadowRoot;
    if (dialogRoot && !dialogRoot.querySelector('#punk-no-border-style')) {
      const style = document.createElement('style');
      style.id = 'punk-no-border-style';
      style.textContent =
        'dialog { border: none !important; outline: none !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25) !important; }';
      dialogRoot.appendChild(style);
    }
  }

  #openSetup = async () => {
    const providerName = this.data?.providerName;
    if (providerName) {
      await umbOpenModal(this, CURRENT_USER_MFA_ENABLE_MODAL, {
        data: {
          providerName,
          displayName: providerName,
        },
      }).catch(() => {});
    } else {
      await umbOpenModal(this, CURRENT_USER_MFA_MODAL).catch(() => {});
    }
    this.modalContext?.submit();
  };

  render() {
    return html`
      <uui-dialog-layout headline="Two-Factor Authentication Required">
        <p>
          Two-factor authentication is required to access the Umbraco backoffice.
          Please enable two-factor authentication for your account to continue.
        </p>
        <uui-button
          slot="actions"
          look="primary"
          color="positive"
          label="Set Up Two-Factor Authentication"
          @click=${this.#openSetup}>
          Set Up Two-Factor Authentication
        </uui-button>
      </uui-dialog-layout>
    `;
  }
}

if (!customElements.get('punk-force-2fa-modal')) {
  customElements.define('punk-force-2fa-modal', PunkForce2faModalElement);
}

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

function setBackgroundObscured(host, obscured) {
  const root = host?.shadowRoot;
  if (!root) {
    return;
  }

  for (const child of root.children) {
    if (child.tagName === 'UMB-BACKOFFICE-MODAL-CONTAINER' || child.tagName === 'STYLE') {
      continue;
    }

    if (obscured) {
      child.style.filter = 'blur(5px) brightness(0.7)';
      child.style.transition = 'filter 0.2s ease';
    } else {
      child.style.filter = '';
      child.style.transition = '';
    }
  }
}

let forceTwoFactorActive = false;

function hideDisableButtonInMfaModals() {
  customElements.whenDefined('umb-current-user-mfa-modal').then(() => {
    const cls = customElements.get('umb-current-user-mfa-modal');
    if (!cls || cls.prototype._punkPatched) {
      return;
    }

    cls.prototype._punkPatched = true;
    const origUpdated = cls.prototype.updated;
    cls.prototype.updated = function (...args) {
      origUpdated?.apply(this, args);
      const sr = this.shadowRoot;
      if (!sr) {
        return;
      }

      let style = sr.querySelector('#punk-hide-disable-style');
      if (!style) {
        style = document.createElement('style');
        style.id = 'punk-hide-disable-style';
        style.textContent = 'uui-button[color="danger"] { display: none !important; }';
        sr.appendChild(style);
      }
      style.disabled = !forceTwoFactorActive;
    };
  });
}

export const onInit = (host, extensionRegistry) => {
  extensionRegistry.register({
    type: 'modal',
    alias: 'punkTwoFactor.ForceMfaModal',
    name: 'punkTwoFactor Force MFA Modal',
    element: PunkForce2faModalElement,
  });

  let enforcing = false;

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
        forceTwoFactorActive = !!status?.forceTwoFactor;
        if (forceTwoFactorActive) {
          hideDisableButtonInMfaModals();
        }

        if (status?.forceTwoFactor && !status.isTwoFactorEnabled) {
          setBackgroundObscured(host, true);
        }

        while (status?.forceTwoFactor && !status.isTwoFactorEnabled && authContext.getIsAuthorized()) {
          await umbOpenModal(host, FORCE_MFA_MODAL, {
            data: { providerName: status.providerName },
          }).catch(() => {});

          if (!authContext.getIsAuthorized()) {
            break;
          }

          status = await fetchTwoFactorStatus(authContext);
        }
      } catch (err) {
        console.error('[punkTwoFactor] Failed to check forced two-factor status:', err);
      } finally {
        setBackgroundObscured(host, false);
        enforcing = false;
      }
    });
  });
};
