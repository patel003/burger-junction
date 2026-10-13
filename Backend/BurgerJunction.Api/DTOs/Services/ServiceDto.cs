namespace BurgerJunction.Api.DTOs.Services;

public record ServiceDto(
    int Id,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    bool IsActive,
    DateTime CreatedAt
);