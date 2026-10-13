namespace BurgerJunction.Api.DTOs.Categories;

public record CategoryDto(
    int Id,
    string Name,
    int ProductCount,
    bool IsActive
);

public record CategoryRequestDto(
    string Name,
    bool IsActive = true
);