using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Community.PunkTwoFactor.Extensions;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

namespace Umbraco.Community.PunkTwoFactor.Middleware
{
    /// <summary>
    /// Enforces two-factor authentication on Umbraco Management API requests when <see cref="TwoFactorConfig.ForceTwoFactor"/> is enabled.
    /// </summary>
    public class ForceTwoFactorMiddleware
    {
        private const string ManagementApiPrefix = "/umbraco/management/api/";

        private static readonly string[] AllowedPrefixes =
        [
            "/umbraco/management/api/v1/security/",
            "/umbraco/management/api/v1/server/",
            "/umbraco/management/api/v1/manifest/",
            "/umbraco/management/api/v1/punk-two-factor/",
        ];

        private readonly RequestDelegate _next;
        private readonly IOptionsMonitor<TwoFactorConfig> _configMonitor;

        public ForceTwoFactorMiddleware(
            RequestDelegate next,
            IOptionsMonitor<TwoFactorConfig> configMonitor)
        {
            _next = next ?? throw new ArgumentNullException(nameof(next));
            _configMonitor = configMonitor ?? throw new ArgumentNullException(nameof(configMonitor));
        }

        public async Task InvokeAsync(
            HttpContext context,
            IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
            ITwoFactorLoginService twoFactorLoginService)
        {
            if (!_configMonitor.CurrentValue.ForceTwoFactor)
            {
                await _next(context);
                return;
            }

            var path = context.Request.Path.Value;
            if (string.IsNullOrEmpty(path) ||
                !path.StartsWith(ManagementApiPrefix, StringComparison.OrdinalIgnoreCase) ||
                HttpMethods.IsOptions(context.Request.Method) ||
                HttpMethods.IsHead(context.Request.Method))
            {
                await _next(context);
                return;
            }

            var currentUser = backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser;
            if (currentUser == null || TwoFactorEnforcementHelper.IsUserExempt(currentUser, _configMonitor.CurrentValue))
            {
                await _next(context);
                return;
            }

            var enabledProviders = (await twoFactorLoginService.GetEnabledTwoFactorProviderNamesAsync(currentUser.Key)).ToList();
            var isDisableCurrentUser2Fa =
                HttpMethods.IsDelete(context.Request.Method) &&
                path.StartsWith("/umbraco/management/api/v1/user/current/2fa", StringComparison.OrdinalIgnoreCase);

            if (isDisableCurrentUser2Fa && enabledProviders.Count <= 1)
            {
                await WriteForbiddenAsync(
                    context,
                    "Two-factor authentication cannot be disabled",
                    "Two-factor authentication is enforced by configuration and cannot be disabled.");
                return;
            }

            if (enabledProviders.Count > 0 || IsAllowedWithoutTwoFactor(path, context.Request.Method))
            {
                await _next(context);
                return;
            }

            await WriteForbiddenAsync(
                context,
                "Two-factor authentication required",
                "You must enable two-factor authentication before accessing the backoffice.");
        }

        private static bool IsAllowedWithoutTwoFactor(string path, string method)
        {
            foreach (var prefix in AllowedPrefixes)
            {
                if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            if (path.Equals("/umbraco/management/api/v1/user/current", StringComparison.OrdinalIgnoreCase) &&
                HttpMethods.IsGet(method))
            {
                return true;
            }

            if (path.Equals("/umbraco/management/api/v1/user/current/login-providers", StringComparison.OrdinalIgnoreCase) &&
                HttpMethods.IsGet(method))
            {
                return true;
            }

            if (path.StartsWith("/umbraco/management/api/v1/user/current/2fa", StringComparison.OrdinalIgnoreCase) &&
                (HttpMethods.IsGet(method) || HttpMethods.IsPost(method)))
            {
                return true;
            }

            return false;
        }

        private static Task WriteForbiddenAsync(HttpContext context, string title, string detail)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            return context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = (int)HttpStatusCode.Forbidden,
                Title = title,
                Detail = detail,
            });
        }
    }
}
