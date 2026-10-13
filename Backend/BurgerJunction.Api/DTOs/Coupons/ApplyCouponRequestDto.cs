namespace BurgerJunction.Api.DTOs.Coupons;

public record ApplyCouponRequestDto(
    string Code,
    decimal OrderAmount
);