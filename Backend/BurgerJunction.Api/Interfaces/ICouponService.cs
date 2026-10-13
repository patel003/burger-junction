using BurgerJunction.Api.DTOs.Coupons;

namespace BurgerJunction.Api.Interfaces;

public interface ICouponService
{
    Task<List<CouponDto>> GetAllAsync();

    Task<CouponDto?> GetByIdAsync(int id);

    Task<CouponDto> CreateAsync(CouponRequestDto dto);

    Task<CouponDto?> UpdateAsync(int id, CouponRequestDto dto);

    Task<bool> DeleteAsync(int id);

    Task<CouponApplyResultDto> ApplyAsync(ApplyCouponRequestDto dto);
    Task<List<CouponDto>> GetActiveAsync();
}