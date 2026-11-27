using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Community.PunkTwoFactor.Extensions;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Authorization;

namespace Umbraco.Community.PunkTwoFactor.Controllers
{
    /// <summary>
    /// Exposes the current two-factor enforcement status for the authenticated backoffice user.
    /// </summary>
    [ApiController]
    [Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
    [Route("umbraco/management/api/v1/punk-two-factor")]
    public class PunkTwoFactorController : ControllerBase
    {
        private readonly IOptionsMonitor<TwoFactorConfig> _configMonitor;
        private readonly IBackOfficeSecurityAccessor _backOfficeSecurityAccessor;
        private readonly ITwoFactorLoginService _twoFactorLoginService;

        public PunkTwoFactorController(
            IOptionsMonitor<TwoFactorConfig> configMonitor,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            ITwoFactorLoginService twoFactorLoginService)
        {
            _configMonitor = configMonitor ?? throw new ArgumentNullException(nameof(configMonitor));
            _backOfficeSecurityAccessor = backOfficeSecurityAccessor ?? throw new ArgumentNullException(nameof(backOfficeSecurityAccessor));
            _twoFactorLoginService = twoFactorLoginService ?? throw new ArgumentNullException(nameof(twoFactorLoginService));
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var currentUser = _backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var config = _configMonitor.CurrentValue;
            var isEnforcedForUser = config.ForceTwoFactor && !TwoFactorEnforcementHelper.IsUserExempt(currentUser, config);
            var enabledProviders = await _twoFactorLoginService.GetEnabledTwoFactorProviderNamesAsync(currentUser.Key);
            return Ok(new
            {
                forceTwoFactor = isEnforcedForUser,
                isTwoFactorEnabled = enabledProviders.Any(),
                providerName = config.ProviderName,
            });
        }
    }
}
