namespace BurgerJunction.Api.DTOs.Customers;

public record CustomerDto(
    string Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    DateTime CreatedAt
);