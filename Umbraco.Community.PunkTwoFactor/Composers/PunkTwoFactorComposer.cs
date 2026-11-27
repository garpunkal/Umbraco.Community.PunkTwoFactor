using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Community.PunkTwoFactor.Middleware;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Community.PunkTwoFactor.Providers;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Web.Common.ApplicationBuilder;
using Umbraco.Extensions;

namespace Umbraco.Community.PunkTwoFactor.Composers
{
    public class PunkTwoFactorComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            var configSection = builder.Config.GetSection(TwoFactorConfig.ConfigName);
            builder.Services.Configure<TwoFactorConfig>(configSection);

            var twoFactorConfig = configSection.Get<TwoFactorConfig>() ?? new TwoFactorConfig();

            var identityBuilder = new BackOfficeIdentityBuilder(builder.Services);
            identityBuilder.AddTwoFactorProvider<UmbracoUserAppAuthenticator>(twoFactorConfig.ProviderName);

            builder.Services.Configure<UmbracoPipelineOptions>(options =>
            {
                options.AddFilter(new UmbracoPipelineFilter(
                    "PunkTwoFactor",
                    postPipeline: app => app.UseMiddleware<ForceTwoFactorMiddleware>()));
            });
        }
    }
}
