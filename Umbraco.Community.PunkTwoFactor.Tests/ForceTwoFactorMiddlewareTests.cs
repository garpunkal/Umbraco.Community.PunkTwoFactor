using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Community.PunkTwoFactor.Middleware;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Umbraco.Community.PunkTwoFactor.Tests;

public class ForceTwoFactorMiddlewareTests
{
    private static IOptionsMonitor<TwoFactorConfig> CreateOptionsMonitor(
        bool forceTwoFactor,
        string[]? exemptUserGroups = null)
    {
        var monitor = new Mock<IOptionsMonitor<TwoFactorConfig>>();
        monitor.SetupGet(m => m.CurrentValue).Returns(new TwoFactorConfig
        {
            ForceTwoFactor = forceTwoFactor,
            ExemptUserGroups = exemptUserGroups ?? [],
        });
        return monitor.Object;
    }

    private static IBackOfficeSecurityAccessor CreateSecurityAccessor(Guid? userKey, string[]? groupAliases = null)
    {
        var accessor = new Mock<IBackOfficeSecurityAccessor>();
        if (userKey == null)
        {
            accessor.SetupGet(a => a.BackOfficeSecurity).Returns((IBackOfficeSecurity?)null);
            return accessor.Object;
        }

        var groups = (groupAliases ?? []).Select(alias =>
        {
            var group = new Mock<IReadOnlyUserGroup>();
            group.SetupGet(g => g.Alias).Returns(alias);
            return group.Object;
        }).ToArray();

        var user = new Mock<IUser>();
        user.SetupGet(u => u.Key).Returns(userKey.Value);
        user.SetupGet(u => u.Groups).Returns(groups);

        var security = new Mock<IBackOfficeSecurity>();
        security.SetupGet(s => s.CurrentUser).Returns(user.Object);
        accessor.SetupGet(a => a.BackOfficeSecurity).Returns(security.Object);
        return accessor.Object;
    }

    [Fact]
    public async Task InvokeAsync_WhenForceTwoFactorDisabled_CallsNext()
    {
        var nextCalled = false;
        var middleware = new ForceTwoFactorMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptionsMonitor(false));

        var context = new DefaultHttpContext();
        context.Request.Path = "/umbraco/management/api/v1/document/root";

        await middleware.InvokeAsync(
            context,
            CreateSecurityAccessor(Guid.NewGuid()),
            Mock.Of<ITwoFactorLoginService>());

        Assert.True(nextCalled);
    }

    [Theory]
    [InlineData("/umbraco/management/api/v1/document/root", "GET", false)]
    [InlineData("/umbraco/management/api/v1/punk-two-factor/status", "GET", true)]
    [InlineData("/umbraco/management/api/v1/user/current", "GET", true)]
    [InlineData("/umbraco/management/api/v1/user/current/2fa", "GET", true)]
    [InlineData("/umbraco/management/api/v1/user/current/2fa/Two%20Factor%20Authentication", "POST", true)]
    [InlineData("/umbraco/management/api/v1/security/back-office/token", "POST", true)]
    public async Task InvokeAsync_WhenForceTwoFactorEnabledAndUserHasNo2Fa_EnforcesAllowlist(
        string path,
        string method,
        bool expectedAllowed)
    {
        var userKey = Guid.NewGuid();
        var twoFactorService = new Mock<ITwoFactorLoginService>();
        twoFactorService
            .Setup(s => s.GetEnabledTwoFactorProviderNamesAsync(userKey))
            .ReturnsAsync(Array.Empty<string>());

        var nextCalled = false;
        var middleware = new ForceTwoFactorMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptionsMonitor(true));

        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = method;
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context, CreateSecurityAccessor(userKey), twoFactorService.Object);

        Assert.Equal(expectedAllowed, nextCalled);
        if (!expectedAllowed)
        {
            Assert.Equal((int)HttpStatusCode.Forbidden, context.Response.StatusCode);
        }
    }

    [Fact]
    public async Task InvokeAsync_WhenForceTwoFactorEnabled_BlocksDeleteOnCurrentUser2Fa()
    {
        var userKey = Guid.NewGuid();
        var twoFactorService = new Mock<ITwoFactorLoginService>();
        twoFactorService
            .Setup(s => s.GetEnabledTwoFactorProviderNamesAsync(userKey))
            .ReturnsAsync(["Two Factor Authentication"]);

        var nextCalled = false;
        var middleware = new ForceTwoFactorMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptionsMonitor(true));

        var context = new DefaultHttpContext();
        context.Request.Path = "/umbraco/management/api/v1/user/current/2fa/Two%20Factor%20Authentication";
        context.Request.Method = HttpMethods.Delete;
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context, CreateSecurityAccessor(userKey), twoFactorService.Object);

        Assert.False(nextCalled);
        Assert.Equal((int)HttpStatusCode.Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WhenUserHas2FaEnabled_AllowsManagementApiRequests()
    {
        var userKey = Guid.NewGuid();
        var twoFactorService = new Mock<ITwoFactorLoginService>();
        twoFactorService
            .Setup(s => s.GetEnabledTwoFactorProviderNamesAsync(userKey))
            .ReturnsAsync(["Two Factor Authentication"]);

        var nextCalled = false;
        var middleware = new ForceTwoFactorMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptionsMonitor(true));

        var context = new DefaultHttpContext();
        context.Request.Path = "/umbraco/management/api/v1/document/root";
        context.Request.Method = HttpMethods.Get;

        await middleware.InvokeAsync(context, CreateSecurityAccessor(userKey), twoFactorService.Object);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_WhenUserInExemptGroup_AllowsManagementApiRequests()
    {
        var userKey = Guid.NewGuid();
        var twoFactorService = new Mock<ITwoFactorLoginService>();
        twoFactorService
            .Setup(s => s.GetEnabledTwoFactorProviderNamesAsync(userKey))
            .ReturnsAsync(Array.Empty<string>());

        var nextCalled = false;
        var middleware = new ForceTwoFactorMiddleware(_ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, CreateOptionsMonitor(true, ["writer"]));

        var context = new DefaultHttpContext();
        context.Request.Path = "/umbraco/management/api/v1/document/root";
        context.Request.Method = HttpMethods.Get;

        await middleware.InvokeAsync(context, CreateSecurityAccessor(userKey, ["Writer"]), twoFactorService.Object);

        Assert.True(nextCalled);
    }
}
