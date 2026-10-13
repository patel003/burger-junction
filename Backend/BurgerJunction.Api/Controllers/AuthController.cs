using BurgerJunction.Api.DTOs.Auth;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST: api/auth/register
   [HttpPost("register")]
   [EnableRateLimiting("api")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequestDto dto)
    {
        try
        {
            var result = await _authService.RegisterAsync(dto);

            if (result == null)
            {
                return Conflict(new
                {
                    message = "Email is already registered."
                });
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // POST: api/auth/login
    [HttpPost("login")]
    [EnableRateLimiting("api")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequestDto dto)
    {
        var result = await _authService.LoginAsync(dto);

        if (result == null)
        {
            return Unauthorized(new
            {
                message = "Invalid email or password."
            });
        }

        return Ok(result);
    }

    [Authorize]
[HttpPost("change-password")]
public async Task<IActionResult> ChangePassword(
    [FromBody] ChangePasswordRequestDto dto)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

    if (string.IsNullOrEmpty(userId))
    {
        return Unauthorized(new
        {
            message = "User identity not found."
        });
    }

    try
    {
        var result = await _authService.ChangePasswordAsync(
            userId,
            dto
        );

        if (!result)
        {
            return NotFound(new
            {
                message = "User not found."
            });
        }

        return Ok(new
        {
            message = "Password changed successfully."
        });
    }
    catch (InvalidOperationException ex)
    {
        return BadRequest(new
        {
            message = ex.Message
        });
    }
}
}