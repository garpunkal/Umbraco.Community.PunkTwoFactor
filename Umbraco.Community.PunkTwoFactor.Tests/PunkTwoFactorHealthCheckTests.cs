using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Community.PunkTwoFactor.HealthChecks;
using Umbraco.Community.PunkTwoFactor.Models;
using Umbraco.Cms.Core.HealthChecks;
using Xunit;

namespace Umbraco.Community.PunkTwoFactor.Tests;

public class PunkTwoFactorHealthCheckTests
{
    [Fact]
    public async Task GetStatusAsync_WhenForceTwoFactorEnabled_ReturnsSuccess()
    {
        var monitor = new Mock<IOptionsMonitor<TwoFactorConfig>>();
        monitor.SetupGet(m => m.CurrentValue).Returns(new TwoFactorConfig
        {
            ForceTwoFactor = true,
            ExemptUserGroups = ["writer"],
        });

        var check = new PunkTwoFactorHealthCheck(monitor.Object);
        var results = (await check.GetStatusAsync()).ToList();

        Assert.Single(results);
        Assert.Equal(StatusResultType.Success, results[0].ResultType);
        Assert.Contains("writer", results[0].Message);
    }

    [Fact]
    public async Task GetStatusAsync_WhenForceTwoFactorDisabled_ReturnsInfo()
    {
        var monitor = new Mock<IOptionsMonitor<TwoFactorConfig>>();
        monitor.SetupGet(m => m.CurrentValue).Returns(new TwoFactorConfig { ForceTwoFactor = false });

        var check = new PunkTwoFactorHealthCheck(monitor.Object);
        var results = (await check.GetStatusAsync()).ToList();

        Assert.Single(results);
        Assert.Equal(StatusResultType.Info, results[0].ResultType);
    }
}
