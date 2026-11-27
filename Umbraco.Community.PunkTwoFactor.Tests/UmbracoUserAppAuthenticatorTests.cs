using Google.Authenticator;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Community.PunkTwoFactor.Providers;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Umbraco.Community.PunkTwoFactor.Tests;

public class UmbracoUserAppAuthenticatorTests
{
    private readonly TwoFactorConfig _config = new()
    {
        ProviderName = "Custom Provider",
        Issuer = "Test Issuer",
    };

    [Fact]
    public void ProviderName_ReturnsConfiguredName()
    {
        var userService = new Mock<IUserService>();
        var authenticator = new UmbracoUserAppAuthenticator(Options.Create(_config), userService.Object);

        Assert.Equal("Custom Provider", authenticator.ProviderName);
    }

    [Fact]
    public async Task GetSetupDataAsync_WithValidUser_ReturnsQrSetupModel()
    {
        var userKey = Guid.NewGuid();
        var user = new Mock<IUser>();
        user.SetupGet(u => u.Username).Returns("admin@example.com");

        var userService = new Mock<IUserService>();
        userService.Setup(s => s.GetAsync(userKey)).ReturnsAsync(user.Object);

        var authenticator = new UmbracoUserAppAuthenticator(Options.Create(_config), userService.Object);

        var result = await authenticator.GetSetupDataAsync(userKey, "test-secret-123");
        var model = Assert.IsType<TwoFactorAuthInfo>(result);

        Assert.Equal("test-secret-123", model.Secret);
        Assert.False(string.IsNullOrWhiteSpace(model.ManualEntryKey));
        Assert.StartsWith("data:image/png;base64,", model.QrCodeSetupImageUrl);
    }

    [Fact]
    public async Task GetSetupDataAsync_WhenUserNotFound_ThrowsInvalidOperationException()
    {
        var userKey = Guid.NewGuid();
        var userService = new Mock<IUserService>();
        userService.Setup(s => s.GetAsync(userKey)).ReturnsAsync((IUser?)null);

        var authenticator = new UmbracoUserAppAuthenticator(Options.Create(_config), userService.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() => authenticator.GetSetupDataAsync(userKey, "secret"));
    }

    [Fact]
    public void ValidateTwoFactorPIN_ValidAndInvalidCodes_ReturnsExpectedResult()
    {
        var userService = new Mock<IUserService>();
        var authenticator = new UmbracoUserAppAuthenticator(Options.Create(_config), userService.Object);
        const string secret = "my-secret-key";
        var validCode = new TwoFactorAuthenticator().GetCurrentPIN(secret);

        Assert.True(authenticator.ValidateTwoFactorPIN(secret, validCode));
        Assert.True(authenticator.ValidateTwoFactorSetup(secret, validCode));
        Assert.False(authenticator.ValidateTwoFactorPIN(secret, "000000"));
    }
}
