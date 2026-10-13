using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Orders;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController(
    IOrderService service,
    AppDbContext db,
    IMemoryCache cache
) : ControllerBase
{
    // =========================================
    // ADMIN
    // Get all orders
    // =========================================

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await service.GetAllAsync());
    }


    // =========================================
    // LOGGED-IN CUSTOMER
    // Get my orders
    // =========================================

    [Authorize]
    [HttpGet("my-orders")]
    public async Task<IActionResult> GetMyOrders()
    {
        var userId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message = "User identity not found."
            });
        }

        return Ok(
            await service.GetMyOrdersAsync(userId));
    }


    // =========================================
    // GET SINGLE ORDER
    // Admin → any order
    // Customer → only own order
    // =========================================

    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var userId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message = "User identity not found."
            });
        }


        // Admin can see any order
        if (User.IsInRole("Admin"))
        {
            var adminOrder =
                await service.GetAsync(id);

            return adminOrder is null
                ? NotFound()
                : Ok(adminOrder);
        }


        // Customer can see only own order
        var customerOrder =
            await service.GetMyOrderAsync(
                id,
                userId);

        if (customerOrder is null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        return Ok(customerOrder);
    }


    // =========================================
    // CUSTOMER ONLY
    // Delivery OTP dekhna
    //
    // OTP database me plain text me nahi hota.
    // Rider jab OTP generate karta hai to wo 15 minute
    // ke liye server memory (cache) me rakha jata hai.
    //
    // Sirf us order ka asli customer (UserId match) hi
    // OTP dekh sakta hai. Rider ya Admin ko nahi milega.
    // =========================================

    [Authorize]
    [HttpGet("{id:int}/delivery-otp")]
    public async Task<IActionResult> GetDeliveryOtp(int id)
    {
        var userId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message = "User identity not found."
            });
        }

        // OTP kabhi browser/proxy cache me na rahe
        Response.Headers.CacheControl = "no-store";

        var order = await db.Orders
            .AsNoTracking()
            .Where(x =>
                x.Id == id &&
                x.UserId == userId)
            .Select(x => new { x.Status })
            .FirstOrDefaultAsync();

        // Dusre ka order ho ya exist hi na kare: same response
        if (order is null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (order.Status != "Out for Delivery")
        {
            return Ok(new
            {
                otp = (string?)null
            });
        }

        cache.TryGetValue(
            $"delivery-otp:{id}",
            out string? otp);

        return Ok(new
        {
            otp
        });
    }


    // =========================================
    // CREATE ORDER
    // Customer / Guest
    // =========================================

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateOrderDto dto)
    {
        try
        {
            var userId =
                User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

            var result =
                await service.CreateAsync(
                    dto,
                    userId);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }


    // =========================================
    // ADMIN
    // Update order status
    // =========================================

    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        [FromBody] string status)
    {
        return await service.UpdateStatusAsync(
            id,
            status)
            ? NoContent()
            : NotFound();
    }


    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await service.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Order not found."
                });
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("all")]
    public async Task<IActionResult> DeleteAll()
    {
        var deletedCount = await service.DeleteAllAsync();

        return Ok(new
        {
            message = $"{deletedCount} orders deleted successfully.",
            deletedCount
        });
    }
}