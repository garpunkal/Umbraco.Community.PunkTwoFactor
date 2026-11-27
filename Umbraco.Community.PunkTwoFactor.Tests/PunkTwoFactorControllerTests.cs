using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Community.PunkTwoFactor.Controllers;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Umbraco.Community.PunkTwoFactor.Tests;

public class PunkTwoFactorControllerTests
{
    [Fact]
    public async Task GetStatus_WhenNoCurrentUser_ReturnsUnauthorized()
    {
        var monitor = new Mock<IOptionsMonitor<TwoFactorConfig>>();
        monitor.SetupGet(m => m.CurrentValue).Returns(new TwoFactorConfig());

        var accessor = new Mock<IBackOfficeSecurityAccessor>();
        accessor.SetupGet(a => a.BackOfficeSecurity).Returns((IBackOfficeSecurity?)null);

        var controller = new PunkTwoFactorController(
            monitor.Object,
            accessor.Object,
            Mock.Of<ITwoFactorLoginService>());

        var result = await controller.GetStatus();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetStatus_WhenAuthenticated_ReturnsExpectedStatus()
    {
        var userKey = Guid.NewGuid();
        var monitor = new Mock<IOptionsMonitor<TwoFactorConfig>>();
        monitor.SetupGet(m => m.CurrentValue).Returns(new TwoFactorConfig
        {
            ForceTwoFactor = true,
            ProviderName = "Two Factor Authentication",
        });

        var user = new Mock<IUser>();
        user.SetupGet(u => u.Key).Returns(userKey);
        var security = new Mock<IBackOfficeSecurity>();
        security.SetupGet(s => s.CurrentUser).Returns(user.Object);
        var accessor = new Mock<IBackOfficeSecurityAccessor>();
        accessor.SetupGet(a => a.BackOfficeSecurity).Returns(security.Object);

        var twoFactorService = new Mock<ITwoFactorLoginService>();
        twoFactorService
            .Setup(s => s.GetEnabledTwoFactorProviderNamesAsync(userKey))
            .ReturnsAsync(["Two Factor Authentication"]);

        var controller = new PunkTwoFactorController(monitor.Object, accessor.Object, twoFactorService.Object);

        var result = await controller.GetStatus();
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var type = ok.Value!.GetType();
        Assert.Equal(true, type.GetProperty("forceTwoFactor")!.GetValue(ok.Value));
        Assert.Equal(true, type.GetProperty("isTwoFactorEnabled")!.GetValue(ok.Value));
        Assert.Equal("Two Factor Authentication", type.GetProperty("providerName")!.GetValue(ok.Value));
    }

    [Fact]
    public async Task GetStatus_WhenUserInExemptGroup_ReturnsForceTwoFactorFalse()
    {
        var userKey = Guid.NewGuid();
        var monitor = new Mock<IOptionsMonitor<TwoFactorConfig>>();
        monitor.SetupGet(m => m.CurrentValue).Returns(new TwoFactorConfig
        {
            ForceTwoFactor = true,
            ExemptUserGroups = ["writer"],
        });

        var group = new Mock<IReadOnlyUserGroup>();
        group.SetupGet(g => g.Alias).Returns("writer");

        var user = new Mock<IUser>();
        user.SetupGet(u => u.Key).Returns(userKey);
        user.SetupGet(u => u.Groups).Returns([group.Object]);

        var security = new Mock<IBackOfficeSecurity>();
        security.SetupGet(s => s.CurrentUser).Returns(user.Object);
        var accessor = new Mock<IBackOfficeSecurityAccessor>();
        accessor.SetupGet(a => a.BackOfficeSecurity).Returns(security.Object);

        var twoFactorService = new Mock<ITwoFactorLoginService>();
        twoFactorService
            .Setup(s => s.GetEnabledTwoFactorProviderNamesAsync(userKey))
            .ReturnsAsync(Array.Empty<string>());

        var controller = new PunkTwoFactorController(monitor.Object, accessor.Object, twoFactorService.Object);

        var result = await controller.GetStatus();
        var ok = Assert.IsType<OkObjectResult>(result);
        var type = ok.Value!.GetType();

        Assert.Equal(false, type.GetProperty("forceTwoFactor")!.GetValue(ok.Value));
        Assert.Equal(false, type.GetProperty("isTwoFactorEnabled")!.GetValue(ok.Value));
    }
}
