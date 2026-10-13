namespace BurgerJunction.Api.DTOs.Coupons;

public record CouponApplyResultDto(
    bool IsValid,
    string Message,
    string Code,
    string DiscountType,
    decimal DiscountAmount,
    decimal OriginalAmount,
    decimal FinalAmount
);