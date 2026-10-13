using BurgerJunction.Api.DTOs.Auth;

namespace BurgerJunction.Api.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> RegisterAsync(RegisterRequestDto dto);

    Task<AuthResponseDto?> LoginAsync(LoginRequestDto dto);

    Task<bool> ChangePasswordAsync(string userId,ChangePasswordRequestDto dto);
}