using BurgerJunction.Api.DTOs.Coupons;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/coupons")]
[Authorize(Roles = "Admin")]
public class CouponsController(
    ICouponService couponService
) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await couponService.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var coupon = await couponService.GetByIdAsync(id);

        return coupon is null
            ? NotFound(new { message = "Coupon not found." })
            : Ok(coupon);
    }

  [AllowAnonymous]
  [HttpPost("apply")]
   public async Task<IActionResult> Apply([FromBody] ApplyCouponRequestDto dto)
   {
    var result = await couponService.ApplyAsync(dto);

    return Ok(result);
  }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CouponRequestDto dto)
    {
        try
        {
            var coupon = await couponService.CreateAsync(dto);

            return CreatedAtAction(
                nameof(GetById),
                new { id = coupon.Id },
                coupon
            );
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] CouponRequestDto dto)
    {
        try
        {
            var coupon = await couponService.UpdateAsync(id, dto);

            return coupon is null
                ? NotFound(new { message = "Coupon not found." })
                : Ok(coupon);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await couponService.DeleteAsync(id);

        return deleted
            ? NoContent()
            : NotFound(new { message = "Coupon not found." });
    }
}