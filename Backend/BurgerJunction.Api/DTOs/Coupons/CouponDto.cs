namespace BurgerJunction.Api.DTOs.Coupons;

public record CouponDto(
    int Id,
    string Code,
    string Description,
    string DiscountType,
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    decimal? MaximumDiscountAmount,
    DateTime StartDate,
    DateTime ExpiryDate,
    int UsageLimit,
    int UsedCount,
    bool IsActive,
    DateTime CreatedAt
);