using System.Net;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class PasswordResetController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<PasswordResetController> _logger;

    public PasswordResetController(
        UserManager<ApplicationUser> userManager,
        IEmailService emailService,
        IConfiguration config,
        ILogger<PasswordResetController> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _config = config;
        _logger = logger;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = "";
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = "";
        public string Token { get; set; } = "";
        public string NewPassword { get; set; } = "";
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("password-reset")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Hamesha same jawab: bahar se pata na chale ki email registered hai ya nahi
        const string message =
            "If an account exists for this email, a reset link has been sent.";

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });

        var user = await _userManager.FindByEmailAsync(request.Email.Trim());

        if (user == null || string.IsNullOrEmpty(user.Email))
            return Ok(new { message });

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);

        var baseUrl = (_config["Frontend:BaseUrl"] ?? "http://localhost:4200").TrimEnd('/');

        var link =
            $"{baseUrl}/reset-password?email={WebUtility.UrlEncode(user.Email)}" +
            $"&token={WebUtility.UrlEncode(token)}";

        try
        {
            await _emailService.SendPasswordResetAsync(user.Email, link);
        }
        catch (Exception ex)
        {
            // Token ya link log nahi karte, sirf error
            _logger.LogError(ex, "Failed to send password reset email.");
        }

        return Ok(new { message });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("password-reset")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        const string invalid = "This reset link is invalid or has expired.";

        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = invalid });

        var user = await _userManager.FindByEmailAsync(request.Email.Trim());

        if (user == null)
            return BadRequest(new { message = invalid });

        var result = await _userManager.ResetPasswordAsync(
            user, request.Token, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(" ", result.Errors.Select(e => e.Description));
            return BadRequest(new { message = errors });
        }

        return Ok(new { message = "Password reset successful." });
    }
}