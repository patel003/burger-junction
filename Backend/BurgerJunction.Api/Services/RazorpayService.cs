using BurgerJunction.Api.Data;
using BurgerJunction.Api.Interfaces;
using Microsoft.EntityFrameworkCore;
using Razorpay.Api;

namespace BurgerJunction.Api.Services;

public class RazorpayService(
    AppDbContext db,
    IConfiguration configuration) : IRazorpayService
{
    public async Task<(string RazorpayOrderId, decimal Amount)> CreateOrderAsync(
        int orderId,
        string userId)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(x =>
                x.Id == orderId &&
                x.UserId == userId);

        if (order is null)
            throw new ArgumentException("Order not found.");

        if (order.TotalAmount <= 0)
            throw new ArgumentException("Invalid order amount.");

        // Cancelled order ke liye payment nahi banega
        if (string.Equals(order.Status, "Cancelled",
                StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                "Cancelled order cannot be paid.");

        var existingPayment = await db.Payments
            .FirstOrDefaultAsync(x => x.OrderId == orderId);

        // Already paid order (Razorpay ya COD) par dobara payment nahi
        if (existingPayment?.Status == "Paid")
            throw new InvalidOperationException(
                "This order is already paid.");

        if (existingPayment?.RazorpayOrderId is not null)
        {
            return (
                existingPayment.RazorpayOrderId,
                existingPayment.Amount
            );
        }

        var keyId = configuration["Razorpay:KeyId"];
        var keySecret = configuration["Razorpay:KeySecret"];

        if (string.IsNullOrWhiteSpace(keyId) ||
            string.IsNullOrWhiteSpace(keySecret))
        {
            throw new InvalidOperationException(
                "Razorpay configuration is missing.");
        }

        var client = new RazorpayClient(keyId, keySecret);

        // Paise me, round karke (truncate nahi) - amount hamesha server ke
        // order.TotalAmount se aata hai, browser se nahi.
        var amountInPaise = (long)Math.Round(
            order.TotalAmount * 100m,
            0,
            MidpointRounding.AwayFromZero);

        var options = new Dictionary<string, object>
        {
            { "amount", amountInPaise },
            { "currency", "INR" },
            { "receipt", $"BJ-ORDER-{order.Id}" },
            { "payment_capture", 1 }
        };

        var razorpayOrder = client.Order.Create(options);

        var razorpayOrderId =
            razorpayOrder["id"].ToString();

        if (string.IsNullOrWhiteSpace(razorpayOrderId))
            throw new InvalidOperationException(
                "Razorpay order ID was not generated.");

        var payment = existingPayment ?? new Models.Payment
        {
            OrderId = order.Id,
            Amount = order.TotalAmount,
            PaymentMethod = "Razorpay",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        payment.RazorpayOrderId = razorpayOrderId;

        if (existingPayment is null)
            db.Payments.Add(payment);

        await db.SaveChangesAsync();

        return (
            razorpayOrderId,
            order.TotalAmount
        );
    }
}