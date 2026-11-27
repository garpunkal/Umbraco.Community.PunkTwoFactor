using Microsoft.Extensions.DependencyInjection;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Community.PunkTwoFactor.Providers;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Security;
using Umbraco.Extensions;

namespace Umbraco.Community.PunkTwoFactor.Extensions
{
    public static class UmbracoBuilderExtensions
    {
        public static IUmbracoBuilder AddBackOfficeTwoFactorAuthentication(this IUmbracoBuilder builder, TwoFactorConfig? config = null)
        {
            config ??= new TwoFactorConfig();

            builder.Services.Configure<TwoFactorConfig>(options =>
            {
                options.ProviderName = config.ProviderName;
                options.Issuer = config.Issuer;
                options.ForceTwoFactor = config.ForceTwoFactor;
                options.ExemptUserGroups = config.ExemptUserGroups ?? [];
            });

            var identityBuilder = new BackOfficeIdentityBuilder(builder.Services);
            identityBuilder.AddTwoFactorProvider<UmbracoUserAppAuthenticator>(config.ProviderName);

            return builder;
        }

        public static IUmbracoBuilder AddMemberTwoFactorAuthentication(this IUmbracoBuilder builder, TwoFactorConfig? config = null)
        {
            config ??= new TwoFactorConfig();

            builder.Services.Configure<TwoFactorConfig>(options =>
            {
                options.ProviderName = config.ProviderName;
                options.Issuer = config.Issuer;
                options.ForceTwoFactor = config.ForceTwoFactor;
                options.ExemptUserGroups = config.ExemptUserGroups ?? [];
            });

            var identityBuilder = new MemberIdentityBuilder(builder.Services);
            identityBuilder.AddTwoFactorProvider<UmbracoUserAppAuthenticator>(config.ProviderName);

            return builder;
        }
    }
}