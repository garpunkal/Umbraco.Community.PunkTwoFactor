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
                options.AddFilter(CreatePipelineFilter(
                    "PunkTwoFactor",
                    app => app.UseMiddleware<ForceTwoFactorMiddleware>()));
            });
        }

        private static UmbracoPipelineFilter CreatePipelineFilter(string name, Action<IApplicationBuilder> postPipeline)
        {
            // Umbraco 18+ added optional parameters to UmbracoPipelineFilter's constructor, which breaks
            // binary compatibility when compiled against Umbraco 17. Invoke it dynamically so one
            // net10.0 binary works across Umbraco 17 and 18+.
            var ctor = typeof(UmbracoPipelineFilter).GetConstructors()[0];
            var parameters = ctor.GetParameters();
            var args = new object?[parameters.Length];
            args[0] = name;
            for (var i = 1; i < parameters.Length; i++)
            {
                args[i] = string.Equals(parameters[i].Name, "postPipeline", StringComparison.OrdinalIgnoreCase)
                    ? postPipeline
                    : parameters[i].HasDefaultValue ? parameters[i].DefaultValue : null;
            }

            return (UmbracoPipelineFilter)ctor.Invoke(args);
        }
    }
}
