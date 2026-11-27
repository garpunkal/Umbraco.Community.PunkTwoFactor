using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.HealthChecks;

namespace Umbraco.Community.PunkTwoFactor.HealthChecks
{
    /// <summary>
    /// Umbraco Health Check reporting the current <see cref="TwoFactorConfig.ForceTwoFactor"/> configuration.
    /// </summary>
    [HealthCheck(
        "4B7C2D1A-8E3F-4A9B-9C1D-2E3F4A5B6C7D",
        "Two-Factor Authentication (punkTwoFactor)",
        Description = "Checks whether ForceTwoFactor is enabled for Umbraco backoffice users.",
        Group = "Security")]
    public class PunkTwoFactorHealthCheck : HealthCheck
    {
        private readonly IOptionsMonitor<TwoFactorConfig> _configMonitor;

        public PunkTwoFactorHealthCheck(IOptionsMonitor<TwoFactorConfig> configMonitor)
        {
            _configMonitor = configMonitor ?? throw new ArgumentNullException(nameof(configMonitor));
        }

        public override Task<IEnumerable<HealthCheckStatus>> GetStatusAsync()
        {
            var config = _configMonitor.CurrentValue;

            if (config.ForceTwoFactor)
            {
                var exemptNote = config.ExemptUserGroups is { Length: > 0 }
                    ? $" Exempt user groups: {string.Join(", ", config.ExemptUserGroups)}."
                    : string.Empty;

                return Task.FromResult<IEnumerable<HealthCheckStatus>>(
                [
                    new HealthCheckStatus($"ForceTwoFactor is enabled for provider '{config.ProviderName}'.{exemptNote}")
                    {
                        ResultType = StatusResultType.Success,
                    },
                ]);
            }

            return Task.FromResult<IEnumerable<HealthCheckStatus>>(
            [
                new HealthCheckStatus($"ForceTwoFactor is currently disabled (opt-in mode) for provider '{config.ProviderName}'. Set Umbraco.Community.PunkTwoFactor:ForceTwoFactor to true in appsettings.json to require 2FA for all backoffice users.")
                {
                    ResultType = StatusResultType.Info,
                },
            ]);
        }

        public override HealthCheckStatus ExecuteAction(HealthCheckAction action)
            => new("No automatic action is configured for this check.") { ResultType = StatusResultType.Info };
    }
}
