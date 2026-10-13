using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = "Admin")]
public class RestaurantSettingsController(
    IRestaurantSettingsService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await service.GetAsync();
        return Ok(settings);
    }

    [HttpPut]
    public async Task<IActionResult> Update(
        [FromBody] RestaurantSettings settings)
    {
        var updatedSettings = await service.UpdateAsync(settings);

        return Ok(updatedSettings);
    }
}