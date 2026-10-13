using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/coupons")]
[AllowAnonymous]
public class PublicCouponsController(
    ICouponService couponService
) : ControllerBase
{
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        return Ok(await couponService.GetActiveAsync());
    }
}