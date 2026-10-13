namespace BurgerJunction.Api.DTOs.Services;

public record ServiceRequestDto(
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    bool IsActive
);