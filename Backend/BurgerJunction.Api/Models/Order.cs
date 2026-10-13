namespace BurgerJunction.Api.Models;

public class Order
{
    public int Id { get; set; }

    // Logged-in customer ki Identity User Id
    public string? UserId { get; set; }

    public ApplicationUser? User { get; set; }

    // Assigned rider
    public string? RiderId { get; set; }

    public ApplicationUser? Rider { get; set; }

    public DateTime? AssignedAt { get; set; }

    public DateTime? PickedUpAt { get; set; }

    // Rider live GPS location
    public double? RiderLatitude { get; set; }

    public double? RiderLongitude { get; set; }

    public DateTime? RiderLocationUpdatedAt { get; set; }

    public DateTime? DeliveredAt { get; set; }

    // Rider earning for THIS specific order
    // Ye delivery complete hone par snapshot hoti hai.
    public decimal RiderEarning { get; set; } = 0;

    // Delivery OTP
    // Plain OTP kabhi database me save nahi hota.
    // Sirf HMAC hash save hota hai.
    public string? DeliveryOtpHash { get; set; }

    public DateTime? DeliveryOtpExpiresAt { get; set; }

    public DateTime? DeliveryOtpVerifiedAt { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerPhone { get; set; } = string.Empty;

    public string DeliveryAddress { get; set; } = string.Empty;

    public double? DeliveryLatitude { get; set; }

    public double? DeliveryLongitude { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; } = 0;

    public string? CouponCode { get; set; }

    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderItem> Items { get; set; }
        = new List<OrderItem>();

    public Payment? Payment { get; set; }
}