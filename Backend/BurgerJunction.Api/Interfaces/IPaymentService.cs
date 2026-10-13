using BurgerJunction.Api.DTOs.Payments;

namespace BurgerJunction.Api.Interfaces;

public interface IPaymentService
{
    Task<PaymentDto?> CreateAsync(
        CreatePaymentDto dto,
        string userId
    );

    Task<PaymentDto?> GetByOrderIdAsync(
        int orderId,
        string userId
    );

    Task<bool> UpdateStatusAsync(
         int paymentId,
         string status
    );

    Task<bool> VerifyRazorpayPaymentAsync( VerifyRazorpayPaymentDto dto, string userId);
}