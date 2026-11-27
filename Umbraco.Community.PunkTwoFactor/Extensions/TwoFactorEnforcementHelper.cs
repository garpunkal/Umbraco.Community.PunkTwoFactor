using System;
using System.Linq;
using punkTwoFactor.Models;
using Umbraco.Cms.Core.Models.Membership;

namespace punkTwoFactor.Extensions
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
