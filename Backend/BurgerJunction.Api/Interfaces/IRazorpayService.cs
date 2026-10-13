namespace BurgerJunction.Api.Interfaces;

public interface IRazorpayService
{
    Task<(string RazorpayOrderId, decimal Amount)> CreateOrderAsync(
        int orderId,
        string userId);
}