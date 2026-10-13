using BurgerJunction.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/analytics")]
[Authorize(Roles = "Admin")]
public class AnalyticsController(
    AnalyticsService analyticsService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAnalytics()
    {
        var analytics = await analyticsService.GetAnalyticsAsync();

        return Ok(analytics);
    }
}