namespace BurgerJunction.Api.DTOs.Payments;

public record CreatePaymentDto(
    int OrderId,
    string PaymentMethod
);

public record PaymentDto(
    int Id,
    int OrderId,
    decimal Amount,
    string PaymentMethod,
    string Status,
    DateTime CreatedAt
);