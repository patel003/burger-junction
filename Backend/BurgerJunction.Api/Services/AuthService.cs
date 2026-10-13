using BurgerJunction.Api.DTOs.Auth;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Identity;


namespace BurgerJunction.Api.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwtTokenService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        JwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto?> RegisterAsync(
        RegisterRequestDto dto)
    {
        var existingUser =
            await _userManager.FindByEmailAsync(dto.Email);

        if (existingUser != null)
        {
            return null;
        }

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            EmailConfirmed = true
        };

        var result = await _userManager.CreateAsync(
            user,
            dto.Password
        );

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                "Unable to create account. Please check your registration details."
            );
        }

        var roleResult =
            await _userManager.AddToRoleAsync(
                user,
                "Customer"
            );

        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);

            throw new InvalidOperationException(
                "Unable to complete account setup."
            );
        }

        var token = _jwtTokenService.GenerateToken(
            user,
            "Customer"
        );

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Role = "Customer"
        };
    }

    public async Task<AuthResponseDto?> LoginAsync(
        LoginRequestDto dto)
    {
        var user =
            await _userManager.FindByEmailAsync(dto.Email);

        if (user == null)
        {
            return null;
        }

        var passwordValid =
            await _userManager.CheckPasswordAsync(
                user,
                dto.Password
            );

        if (!passwordValid)
        {
            return null;
        }

        var roles =
            await _userManager.GetRolesAsync(user);

        var role =
            roles.FirstOrDefault() ?? "Customer";

        var token =
            _jwtTokenService.GenerateToken(
                user,
                role
            );

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            Role = role
        };
    }

    public async Task<bool> ChangePasswordAsync(
    string userId,
    ChangePasswordRequestDto dto)
{
    if (dto.NewPassword != dto.ConfirmPassword)
    {
        throw new InvalidOperationException(
            "New password and confirm password do not match."
        );
    }

    var user = await _userManager.FindByIdAsync(userId);

    if (user == null)
    {
        return false;
    }

    var result = await _userManager.ChangePasswordAsync(
        user,
        dto.CurrentPassword,
        dto.NewPassword
    );

    if (!result.Succeeded)
    {
        var errorMessage = string.Join(
            " ",
            result.Errors.Select(error => error.Description)
        );

        throw new InvalidOperationException(errorMessage);
    }

    return true;
}
}