namespace BurgerJunction.Api.DTOs.Coupons;

public record CouponRequestDto(
    string Code,
    string Description,
    string DiscountType,
    decimal DiscountValue,
    decimal MinimumOrderAmount,
    decimal? MaximumDiscountAmount,
    DateTime StartDate,
    DateTime ExpiryDate,
    int UsageLimit,
    bool IsActive
);