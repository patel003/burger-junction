using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Coupons;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class CouponService(AppDbContext db) : ICouponService
{
    public async Task<List<CouponDto>> GetAllAsync()
    {
        return await db.Coupons
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(ToDto())
            .ToListAsync();
    }

    public async Task<List<CouponDto>> GetActiveAsync()
{
    var now = DateTime.UtcNow;

    return await db.Coupons
        .AsNoTracking()
        .Where(x =>
            x.IsActive &&
            x.StartDate <= now &&
            x.ExpiryDate >= now &&
            x.UsedCount < x.UsageLimit
        )
        .OrderBy(x => x.ExpiryDate)
        .Select(ToDto())
        .ToListAsync();
}

    public async Task<CouponDto?> GetByIdAsync(int id)
    {
        return await db.Coupons
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(ToDto())
            .FirstOrDefaultAsync();
    }

    public async Task<CouponDto> CreateAsync(CouponRequestDto dto)
    {
        ValidateCoupon(dto);

        var code = dto.Code.Trim().ToUpperInvariant();

        var exists = await db.Coupons
            .AnyAsync(x => x.Code == code);

        if (exists)
            throw new ArgumentException("Coupon code already exists.");

        var coupon = new Coupon
        {
            Code = code,
            Description = dto.Description.Trim(),
            DiscountType = dto.DiscountType.Trim(),
            DiscountValue = dto.DiscountValue,
            MinimumOrderAmount = dto.MinimumOrderAmount,
            MaximumDiscountAmount = dto.MaximumDiscountAmount,
            StartDate = dto.StartDate,
            ExpiryDate = dto.ExpiryDate,
            UsageLimit = dto.UsageLimit,
            UsedCount = 0,
            IsActive = dto.IsActive
        };

        db.Coupons.Add(coupon);
        await db.SaveChangesAsync();

        return (await GetByIdAsync(coupon.Id))!;
    }

    public async Task<CouponDto?> UpdateAsync(
        int id,
        CouponRequestDto dto)
    {
        ValidateCoupon(dto);

        var coupon = await db.Coupons.FindAsync(id);

        if (coupon is null)
            return null;

        var code = dto.Code.Trim().ToUpperInvariant();

        var exists = await db.Coupons
            .AnyAsync(x => x.Code == code && x.Id != id);

        if (exists)
            throw new ArgumentException("Coupon code already exists.");

        coupon.Code = code;
        coupon.Description = dto.Description.Trim();
        coupon.DiscountType = dto.DiscountType.Trim();
        coupon.DiscountValue = dto.DiscountValue;
        coupon.MinimumOrderAmount = dto.MinimumOrderAmount;
        coupon.MaximumDiscountAmount = dto.MaximumDiscountAmount;
        coupon.StartDate = dto.StartDate;
        coupon.ExpiryDate = dto.ExpiryDate;
        coupon.UsageLimit = dto.UsageLimit;
        coupon.IsActive = dto.IsActive;

        await db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var coupon = await db.Coupons.FindAsync(id);

        if (coupon is null)
            return false;

        db.Coupons.Remove(coupon);

        await db.SaveChangesAsync();

        return true;
    }

    private static void ValidateCoupon(CouponRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            throw new ArgumentException("Coupon code is required.");

        if (string.IsNullOrWhiteSpace(dto.DiscountType))
            throw new ArgumentException("Discount type is required.");

        var discountType = dto.DiscountType.Trim();

        if (discountType != "Percentage" &&
            discountType != "Fixed")
        {
            throw new ArgumentException(
                "Discount type must be Percentage or Fixed.");
        }

        if (dto.DiscountValue <= 0)
            throw new ArgumentException(
                "Discount value must be greater than zero.");

        if (discountType == "Percentage" &&
            dto.DiscountValue > 100)
        {
            throw new ArgumentException(
                "Percentage discount cannot exceed 100.");
        }

        if (dto.MinimumOrderAmount < 0)
            throw new ArgumentException(
                "Minimum order amount cannot be negative.");

        if (dto.MaximumDiscountAmount < 0)
            throw new ArgumentException(
                "Maximum discount amount cannot be negative.");

        if (dto.ExpiryDate <= dto.StartDate)
            throw new ArgumentException(
                "Expiry date must be after start date.");

        if (dto.UsageLimit <= 0)
            throw new ArgumentException(
                "Usage limit must be greater than zero.");
    }

    private static System.Linq.Expressions
        .Expression<Func<Coupon, CouponDto>> ToDto() =>
        x => new CouponDto(
            x.Id,
            x.Code,
            x.Description,
            x.DiscountType,
            x.DiscountValue,
            x.MinimumOrderAmount,
            x.MaximumDiscountAmount,
            x.StartDate,
            x.ExpiryDate,
            x.UsageLimit,
            x.UsedCount,
            x.IsActive,
            x.CreatedAt
        );




    public async Task<CouponApplyResultDto> ApplyAsync(ApplyCouponRequestDto dto)
   {
       if (string.IsNullOrWhiteSpace(dto.Code))
       {
           return new CouponApplyResultDto(
               false,
               "Coupon code is required.",
               string.Empty,
               string.Empty,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       if (dto.OrderAmount <= 0)
       {
           return new CouponApplyResultDto(
               false,
               "Order amount must be greater than zero.",
               dto.Code.Trim().ToUpperInvariant(),
               string.Empty,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       var code = dto.Code.Trim().ToUpperInvariant();

       var coupon = await db.Coupons
           .FirstOrDefaultAsync(x => x.Code == code);

       if (coupon is null)
       {
           return new CouponApplyResultDto(
               false,
               "Invalid coupon code.",
               code,
               string.Empty,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       var now = DateTime.UtcNow;

       if (!coupon.IsActive)
       {
           return new CouponApplyResultDto(
               false,
               "This coupon is inactive.",
               code,
               coupon.DiscountType,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       if (now < coupon.StartDate)
       {
           return new CouponApplyResultDto(
               false,
               "This coupon is not active yet.",
               code,
               coupon.DiscountType,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       if (now > coupon.ExpiryDate)
       {
           return new CouponApplyResultDto(
               false,
               "This coupon has expired.",
               code,
               coupon.DiscountType,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       if (coupon.UsedCount >= coupon.UsageLimit)
       {
           return new CouponApplyResultDto(
               false,
               "This coupon usage limit has been reached.",
               code,
               coupon.DiscountType,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       if (dto.OrderAmount < coupon.MinimumOrderAmount)
       {
           return new CouponApplyResultDto(
               false,
               $"Minimum order amount for this coupon is ₹{coupon.MinimumOrderAmount:0.00}.",
               code,
               coupon.DiscountType,
               0,
               dto.OrderAmount,
               dto.OrderAmount
           );
       }

       decimal discountAmount;

       if (coupon.DiscountType.Equals(
           "Percentage",
           StringComparison.OrdinalIgnoreCase))
       {
           discountAmount =
               dto.OrderAmount * coupon.DiscountValue / 100m;
       }
       else
       {
           discountAmount = coupon.DiscountValue;
       }

       if (coupon.MaximumDiscountAmount.HasValue)
       {
           discountAmount = Math.Min(
               discountAmount,
               coupon.MaximumDiscountAmount.Value
           );
       }

       discountAmount = Math.Min(
           discountAmount,
           dto.OrderAmount
       );

       discountAmount = Math.Round(
           discountAmount,
           2,
           MidpointRounding.AwayFromZero
       );

       var finalAmount = dto.OrderAmount - discountAmount;

       return new CouponApplyResultDto(
           true,
           "Coupon applied successfully.",
           code,
           coupon.DiscountType,
           discountAmount,
           dto.OrderAmount,
           finalAmount
       );
    }
}