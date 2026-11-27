using System;
using System.Linq;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.Models.Membership;

namespace Umbraco.Community.PunkTwoFactor.Extensions
{
    internal static class TwoFactorEnforcementHelper
    {
        public static bool IsUserExempt(IUser user, TwoFactorConfig config)
        {
            if (config.ExemptUserGroups == null || config.ExemptUserGroups.Length == 0)
            {
                return false;
            }

            return user.Groups.Any(group =>
                config.ExemptUserGroups.Any(exempt =>
                    string.Equals(group.Alias, exempt, StringComparison.OrdinalIgnoreCase)));
        }
    }
}
