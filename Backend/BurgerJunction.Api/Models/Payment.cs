namespace BurgerJunction.Api.Models;

public class Payment
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public decimal Amount { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string Status { get; set; } = "Pending";

    public string? TransactionId { get; set; }

    // Razorpay details
    public string? RazorpayOrderId { get; set; }

    public string? RazorpayPaymentId { get; set; }

    public string? RazorpaySignature { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}