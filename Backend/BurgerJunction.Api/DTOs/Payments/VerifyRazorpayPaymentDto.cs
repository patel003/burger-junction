namespace BurgerJunction.Api.DTOs.Payments;

public record VerifyRazorpayPaymentDto(
    int OrderId,
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature
);