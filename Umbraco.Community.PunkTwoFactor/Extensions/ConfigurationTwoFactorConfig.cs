using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Community.PunkTwoFactor.Models;

namespace Umbraco.Community.PunkTwoFactor.Extensions
{
    public static class ConfigurationTwoFactorConfig
    {
        public static TwoFactorConfig ConfigureTwoFactorConfig(
            this IServiceCollection services, IConfiguration config, string configName = TwoFactorConfig.ConfigName)
        {
            services.Configure<TwoFactorConfig>(config.GetSection(configName));
            TwoFactorConfig twoFactorConfig = new();
            config.GetSection(configName).Bind(twoFactorConfig);
            return twoFactorConfig;
        }
    }
}
