using BurgerJunction.Api.Data;
using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;
using System.Text;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/rider")]
[Authorize(Roles = "Rider")]
public class RiderController(
    AppDbContext db,
    IConfiguration config,
    IHostEnvironment env,
    IMemoryCache cache
) : ControllerBase
{
    // =========================================================
    // OTP ATTEMPT LIMITS
    // =========================================================
    //
    // - Ek OTP par max 5 galat try. Uske baad OTP cancel ho jata hai
    //   aur rider ko naya OTP generate karna padta hai.
    // - Ek order par 1 ghante me max 5 baar OTP generate ho sakta hai,
    //   taaki rider bar-bar naya OTP banake guess na kar sake.

    private const int MaxOtpAttempts = 5;

    private const int MaxOtpGenerationsPerHour = 5;

    // Parallel requests se limit bypass na ho
    private static readonly object OtpLimitLock = new();

    private sealed record OtpGenerationWindow(
        int Count,
        DateTimeOffset ResetAt);

    // =========================================================
    // OTP HELPERS (HMAC-SHA256, plain OTP DB me save nahi hota)
    // =========================================================

    private string HashOtp(int orderId, string otp)
    {
        var secret =
            config["Otp:HmacKey"]
            ?? throw new InvalidOperationException(
                "Otp:HmacKey is not configured.");

        var key = Encoding.UTF8.GetBytes(secret);

        using var hmac = new HMACSHA256(key);

        return Convert.ToHexString(
            hmac.ComputeHash(
                Encoding.UTF8.GetBytes($"{orderId}:{otp}")));
    }

    private bool OtpMatches(Order order, string? otp)
    {
        if (string.IsNullOrWhiteSpace(order.DeliveryOtpHash) ||
            string.IsNullOrWhiteSpace(otp))
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(order.DeliveryOtpHash),
            Encoding.UTF8.GetBytes(
                HashOtp(order.Id, otp.Trim())));
    }


    // OTP check (verify-otp aur deliver dono yahi use karte hain).
    // OK hone par null return karta hai, warna error response.
    private async Task<IActionResult?> ValidateDeliveryOtpAsync(
        Order order,
        string? otp)
    {
        if (string.IsNullOrWhiteSpace(order.DeliveryOtpHash))
        {
            return BadRequest(new
            {
                message = "Delivery OTP has not been generated."
            });
        }

        if (order.DeliveryOtpExpiresAt == null ||
            order.DeliveryOtpExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new
            {
                message = "Delivery OTP has expired."
            });
        }

        var attemptsKey = $"otp-attempts:{order.Id}";

        var isMatch = false;
        var locked = false;
        var attempts = 0;

        lock (OtpLimitLock)
        {
            attempts =
                cache.TryGetValue(attemptsKey, out int used)
                    ? used
                    : 0;

            if (attempts >= MaxOtpAttempts)
            {
                locked = true;
            }
            else if (OtpMatches(order, otp))
            {
                isMatch = true;
                cache.Remove(attemptsKey);
            }
            else
            {
                attempts++;

                cache.Set(
                    attemptsKey,
                    attempts,
                    TimeSpan.FromMinutes(15));

                locked = attempts >= MaxOtpAttempts;
            }
        }

        if (isMatch)
        {
            return null;
        }

        if (locked)
        {
            await CancelDeliveryOtpAsync(order);

            return StatusCode(429, new
            {
                message =
                    "Too many wrong OTP attempts. " +
                    "This OTP has been cancelled. " +
                    "Please generate a new OTP."
            });
        }

        return BadRequest(new
        {
            message =
                $"Invalid delivery OTP. " +
                $"{MaxOtpAttempts - attempts} attempt(s) left."
        });
    }

    // Galat attempts ki limit ke baad OTP bekaar kar deta hai
    private async Task CancelDeliveryOtpAsync(Order order)
    {
        order.DeliveryOtpHash = null;
        order.DeliveryOtpExpiresAt = null;

        cache.Remove($"delivery-otp:{order.Id}");

        await db.SaveChangesAsync();
    }


    // =========================================================
    // ACTIVE ORDERS
    // =========================================================

    [HttpGet("orders")]
    public async Task<IActionResult> GetActiveOrders()
    {
        var riderId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var orders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .Include(x => x.Payment)
            .Where(x =>
                x.RiderId == riderId &&
                x.Status != "Delivered" &&
                x.Status != "Cancelled")
            .OrderBy(x => x.CreatedAt)
            .Select(x => new RiderOrderDto
            {
                Id = x.Id,

                CustomerName = x.CustomerName,

                CustomerPhone = x.CustomerPhone,

                DeliveryAddress = x.DeliveryAddress,

                DeliveryLatitude = x.DeliveryLatitude,

                DeliveryLongitude = x.DeliveryLongitude,

                TotalAmount = x.TotalAmount,

                Status = x.Status,

                CreatedAt = x.CreatedAt,

                AssignedAt = x.AssignedAt,

                PickedUpAt = x.PickedUpAt,

                RiderEarning = x.RiderEarning,

                PaymentMethod =
                    x.Payment != null
                        ? x.Payment.PaymentMethod
                        : null,

                PaymentStatus =
                    x.Payment != null
                        ? x.Payment.Status
                        : null,

                CashDue =
                    x.Payment != null &&
                    x.Payment.PaymentMethod == "Cash on Delivery" &&
                    x.Payment.Status != "Paid"
                        ? x.TotalAmount
                        : 0,

                Items = x.Items
                    .Select(i => new RiderOrderItemDto
                    {
                        ProductId = i.ProductId,

                        ProductName = i.Product!.Name,

                        Quantity = i.Quantity,

                        Price = i.Price
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }


    // =========================================================
    // DELIVERY HISTORY
    // =========================================================

    [HttpGet("orders/history")]
    public async Task<IActionResult> GetOrderHistory()
    {
        var riderId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var orders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .Include(x => x.Payment)
            .Where(x =>
                x.RiderId == riderId &&
                x.Status == "Delivered")
            .OrderByDescending(x => x.DeliveredAt)
            .Select(x => new RiderOrderDto
            {
                Id = x.Id,

                CustomerName = x.CustomerName,

                CustomerPhone = x.CustomerPhone,

                DeliveryAddress = x.DeliveryAddress,

                DeliveryLatitude = x.DeliveryLatitude,

                DeliveryLongitude = x.DeliveryLongitude,

                TotalAmount = x.TotalAmount,

                Status = x.Status,

                CreatedAt = x.CreatedAt,

                AssignedAt = x.AssignedAt,

                PickedUpAt = x.PickedUpAt,

                RiderEarning = x.RiderEarning,

                PaymentMethod =
                    x.Payment != null
                        ? x.Payment.PaymentMethod
                        : null,

                PaymentStatus =
                    x.Payment != null
                        ? x.Payment.Status
                        : null,

                CashDue = 0,

                Items = x.Items
                    .Select(i => new RiderOrderItemDto
                    {
                        ProductId = i.ProductId,

                        ProductName = i.Product!.Name,

                        Quantity = i.Quantity,

                        Price = i.Price
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(orders);
    }


    // =========================================================
    // RIDER PROFILE
    // =========================================================

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var profile = await db.RiderProfiles
            .AsNoTracking()
            .Where(x => x.UserId == riderId)
            .Select(x => new RiderProfileDto
            {
                FullName = x.User.FullName,

                PhoneNumber =
                    x.User.PhoneNumber ?? string.Empty,

                VehicleNumber =
                    x.VehicleNumber,

                EarningPerDelivery =
                    x.EarningPerDelivery,

                IsActive =
                    x.IsActive,

                IsOnline =
                    x.IsOnline
            })
            .FirstOrDefaultAsync();

        if (profile == null)
        {
            return NotFound(new
            {
                message = "Rider profile not found."
            });
        }

        return Ok(profile);
    }


    // =========================================================
    // ONLINE / OFFLINE
    // =========================================================

    [HttpPut("availability")]
    public async Task<IActionResult> UpdateAvailability(
        [FromBody] RiderAvailabilityRequest request)
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var profile = await db.RiderProfiles
            .FirstOrDefaultAsync(
                x => x.UserId == riderId);

        if (profile == null)
        {
            return NotFound(new
            {
                message = "Rider profile not found."
            });
        }

        if (!profile.IsActive)
        {
            return BadRequest(new
            {
                message = "Your rider account is inactive."
            });
        }

        profile.IsOnline = request.IsOnline;

        await db.SaveChangesAsync();

        return Ok(new
        {
            message = profile.IsOnline
                ? "You are now online."
                : "You are now offline.",

            isOnline = profile.IsOnline
        });
    }


    // =========================================================
    // RIDER SUMMARY
    // =========================================================

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var today = DateTime.UtcNow.Date;

        var tomorrow = today.AddDays(1);


        // -----------------------------------------------------
        // TODAY'S DELIVERED ORDERS
        // -----------------------------------------------------

        var deliveredOrders = await db.Orders
            .AsNoTracking()
            .Include(x => x.Payment)
            .Where(x =>
                x.RiderId == riderId &&
                x.Status == "Delivered" &&
                x.DeliveredAt >= today &&
                x.DeliveredAt < tomorrow)
            .ToListAsync();


        // -----------------------------------------------------
        // TODAY'S DELIVERY COUNT
        // -----------------------------------------------------

        var todayDeliveries =
            deliveredOrders.Count;


        // -----------------------------------------------------
        // TODAY'S CASH COLLECTED
        // -----------------------------------------------------

        var todayCashCollected =
            deliveredOrders
                .Where(x =>
                    x.Payment != null &&
                    x.Payment.PaymentMethod ==
                        "Cash on Delivery" &&
                    x.Payment.Status == "Paid")
                .Sum(x => x.TotalAmount);


        // -----------------------------------------------------
        // TODAY'S RIDER EARNINGS
        // -----------------------------------------------------

        var todayEarnings =
            deliveredOrders
                .Sum(x => x.RiderEarning);


        // -----------------------------------------------------
        // TOTAL RIDER EARNINGS
        // -----------------------------------------------------

        var totalEarnings =
            await db.Orders
                .AsNoTracking()
                .Where(x =>
                    x.RiderId == riderId &&
                    x.Status == "Delivered")
                .SumAsync(x => x.RiderEarning);


        return Ok(new
        {
            todayDeliveries,

            todayCashCollected,

            todayEarnings,

            totalEarnings
        });
    }


    // =========================================================
    // GENERATE DELIVERY OTP
    // =========================================================

    [HttpPost("orders/{id:int}/generate-otp")]
    public async Task<IActionResult> GenerateDeliveryOtp(
        int id)
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var order = await db.Orders
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.RiderId == riderId);

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found or not assigned to this rider."
            });
        }


        // OTP only after rider picks up order
        if (order.Status != "Out for Delivery")
        {
            return BadRequest(new
            {
                message =
                    $"OTP cannot be generated from '{order.Status}' status."
            });
        }


        // Bar-bar naya OTP banake guess karne se rokta hai
        var generationKey = $"otp-generations:{order.Id}";
        var generationBlocked = false;

        lock (OtpLimitLock)
        {
            var window =
                cache.TryGetValue(
                    generationKey,
                    out OtpGenerationWindow? existing) &&
                existing != null
                    ? existing
                    : new OtpGenerationWindow(
                        0,
                        DateTimeOffset.UtcNow.AddHours(1));

            if (window.Count >= MaxOtpGenerationsPerHour)
            {
                generationBlocked = true;
            }
            else
            {
                cache.Set(
                    generationKey,
                    window with { Count = window.Count + 1 },
                    window.ResetAt);
            }
        }

        if (generationBlocked)
        {
            return StatusCode(429, new
            {
                message =
                    "OTP generate karne ki limit poori ho gayi. " +
                    "Thodi der baad dobara try karein."
            });
        }


        // Cryptographically secure 6-digit OTP
        var otp =
            RandomNumberGenerator
                .GetInt32(100000, 1000000)
                .ToString();


        // Sirf hash save hota hai, plain OTP nahi
        order.DeliveryOtpHash =
            HashOtp(order.Id, otp);

        order.DeliveryOtpExpiresAt =
            DateTime.UtcNow.AddMinutes(15);

        order.DeliveryOtpVerifiedAt = null;

        // Naye OTP par galat attempts ka count zero se shuru
        cache.Remove($"otp-attempts:{order.Id}");

        // Plain OTP DB me nahi, sirf 15 minute ke liye server memory me.
        // Customer tracking page isi se OTP dikhata hai.
        cache.Set(
            $"delivery-otp:{order.Id}",
            otp,
            TimeSpan.FromMinutes(15));


        await db.SaveChangesAsync();


        return Ok(new
        {
            message =
                "Delivery OTP generated successfully.",

            orderId = order.Id,

            // Plain OTP sirf Development me response me aata hai.
            // Production me null jayega (OTP customer ko SMS /
            // tracking page se milna chahiye).
            otp = env.IsDevelopment() ? otp : null,

            expiresAt =
                order.DeliveryOtpExpiresAt
        });
    }


    // =========================================================
    // VERIFY DELIVERY OTP
    // =========================================================

    [HttpPost("orders/{id:int}/verify-otp")]
    public async Task<IActionResult> VerifyDeliveryOtp(
        int id,
        [FromBody] VerifyDeliveryOtpRequest request)
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var order = await db.Orders
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.RiderId == riderId);

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found or not assigned to this rider."
            });
        }


        if (order.Status != "Out for Delivery")
        {
            return BadRequest(new
            {
                message =
                    $"OTP cannot be verified from '{order.Status}' status."
            });
        }


        var otpError =
            await ValidateDeliveryOtpAsync(
                order,
                request.Otp);

        if (otpError != null)
        {
            return otpError;
        }


        order.DeliveryOtpVerifiedAt =
            DateTime.UtcNow;


        await db.SaveChangesAsync();


        return Ok(new
        {
            message =
                "Delivery OTP verified successfully.",

            orderId = order.Id,

            verifiedAt =
                order.DeliveryOtpVerifiedAt
        });
    }


    // =========================================================
    // PICK UP ORDER
    // =========================================================

    [HttpPut("orders/{id:int}/pickup")]
    public async Task<IActionResult> PickupOrder(
        int id)
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }

        var order = await db.Orders
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.RiderId == riderId);

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found or not assigned to this rider."
            });
        }


        if (order.Status != "Ready for Pickup")
        {
            return BadRequest(new
            {
                message =
                    $"Order cannot be picked up from '{order.Status}' status."
            });
        }


        order.Status =
            "Out for Delivery";

        order.PickedUpAt =
            DateTime.UtcNow;


        await db.SaveChangesAsync();


        return Ok(new
        {
            message =
                "Order picked up successfully.",

            orderId = order.Id,

            status = order.Status,

            pickedUpAt =
                order.PickedUpAt
        });
    }


    // =========================================================
    // DELIVER ORDER
    // =========================================================

    [HttpPut("orders/{id:int}/deliver")]
    public async Task<IActionResult> DeliverOrder(
        int id,
        [FromBody] VerifyDeliveryOtpRequest request)
    {
        var riderId =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(riderId))
        {
            return Unauthorized(new
            {
                message = "Rider identity not found."
            });
        }


        // -----------------------------------------------------
        // FIND RIDER PROFILE
        // -----------------------------------------------------

        var riderProfile =
            await db.RiderProfiles
                .FirstOrDefaultAsync(
                    x => x.UserId == riderId);

        if (riderProfile == null)
        {
            return NotFound(new
            {
                message =
                    "Rider profile not found."
            });
        }


        // -----------------------------------------------------
        // FIND ORDER
        // -----------------------------------------------------

        var order = await db.Orders
            .Include(x => x.Payment)
            .FirstOrDefaultAsync(x =>
                x.Id == id &&
                x.RiderId == riderId);

        if (order == null)
        {
            return NotFound(new
            {
                message =
                    "Order not found or not assigned to this rider."
            });
        }


        // -----------------------------------------------------
        // STATUS CHECK
        // -----------------------------------------------------

        if (order.Status != "Out for Delivery")
        {
            return BadRequest(new
            {
                message =
                    $"Order cannot be delivered from '{order.Status}' status."
            });
        }


        // -----------------------------------------------------
        // OTP CHECK
        // -----------------------------------------------------

        var otpError =
            await ValidateDeliveryOtpAsync(
                order,
                request.Otp);

        if (otpError != null)
        {
            return otpError;
        }


        // -----------------------------------------------------
        // OTP VERIFIED
        // -----------------------------------------------------

        order.DeliveryOtpVerifiedAt =
            DateTime.UtcNow;


        // -----------------------------------------------------
        // SAVE RIDER EARNING SNAPSHOT
        // -----------------------------------------------------
        //
        // Example:
        // Admin rate = ₹35
        // Order delivered = ₹35 earning
        //
        // Agar future me Admin rate ₹50 kare,
        // purana order ₹35 hi rahega.
        //

        order.RiderEarning =
            riderProfile.EarningPerDelivery;


        // -----------------------------------------------------
        // MARK ORDER DELIVERED
        // -----------------------------------------------------

        order.Status =
            "Delivered";

        order.DeliveredAt =
            DateTime.UtcNow;


        // -----------------------------------------------------
        // COD PAYMENT
        // -----------------------------------------------------

        if (
            order.Payment != null &&
            order.Payment.PaymentMethod ==
                "Cash on Delivery" &&
            order.Payment.Status != "Paid"
        )
        {
            order.Payment.Status =
                "Paid";
        }


        await db.SaveChangesAsync();


        // Delivery ho gayi, OTP ki ab zaroorat nahi
        cache.Remove($"delivery-otp:{order.Id}");

        return Ok(new
        {
            message =
                "Order delivered successfully.",

            orderId =
                order.Id,

            status =
                order.Status,

            deliveredAt =
                order.DeliveredAt,

            riderEarning =
                order.RiderEarning,

            paymentStatus =
                order.Payment?.Status
        });
    }
}


// =========================================================
// REQUEST DTOs
// =========================================================

public record RiderAvailabilityRequest(
    bool IsOnline
);


public record VerifyDeliveryOtpRequest(
    string Otp
);


// =========================================================
// RIDER ORDER DTO
// =========================================================

public class RiderOrderDto
{
    public int Id { get; set; }

    public string CustomerName { get; set; }
        = string.Empty;

    public string CustomerPhone { get; set; }
        = string.Empty;

    public string DeliveryAddress { get; set; }
        = string.Empty;

    // Customer delivery location (Open in Maps ke liye)
    public double? DeliveryLatitude { get; set; }

    public double? DeliveryLongitude { get; set; }

    public decimal TotalAmount { get; set; }

    public string Status { get; set; }
        = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? AssignedAt { get; set; }

    public DateTime? PickedUpAt { get; set; }

    // Earning for this specific delivery
    public decimal RiderEarning { get; set; }

    public string? PaymentMethod { get; set; }

    public string? PaymentStatus { get; set; }

    public decimal CashDue { get; set; }

    public List<RiderOrderItemDto> Items { get; set; }
        = [];
}


// =========================================================
// RIDER ORDER ITEM DTO
// =========================================================

public class RiderOrderItemDto
{
    public int ProductId { get; set; }

    public string ProductName { get; set; }
        = string.Empty;

    public int Quantity { get; set; }

    public decimal Price { get; set; }
}


// =========================================================
// RIDER PROFILE DTO
// =========================================================

public class RiderProfileDto
{
    public string FullName { get; set; }
        = string.Empty;

    public string PhoneNumber { get; set; }
        = string.Empty;

    public string VehicleNumber { get; set; }
        = string.Empty;

    public decimal EarningPerDelivery { get; set; }

    public bool IsActive { get; set; }

    public bool IsOnline { get; set; }
}