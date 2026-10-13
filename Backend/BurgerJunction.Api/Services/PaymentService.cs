using System.Security.Cryptography;
using System.Text;

using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Payments;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;

using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class PaymentService(
    AppDbContext db,
    IConfiguration configuration) : IPaymentService
{
    // =========================================
    // CREATE PAYMENT
    // =========================================

    public async Task<PaymentDto?> CreateAsync(CreatePaymentDto dto,string userId)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(x =>
                x.Id == dto.OrderId &&
                x.UserId == userId);

        if (order is null)
        {
            return null;
        }

        var paymentMethod = dto.PaymentMethod.Trim();
         if (!string.Equals(paymentMethod,
               "Cash on Delivery",
               StringComparison.OrdinalIgnoreCase) &&
           !string.Equals(
               paymentMethod,
               "Razorpay",
               StringComparison.OrdinalIgnoreCase))
         {
           throw new ArgumentException(
               "Invalid payment method. Allowed methods: Cash on Delivery or Razorpay."
           );
         }

        var existingPayment = await db.Payments
            .FirstOrDefaultAsync(x =>
                x.OrderId == dto.OrderId);

        if (existingPayment is not null)
        {
            return MapToDto(existingPayment);
        }

        var payment = new Payment
        {
            OrderId = order.Id,
            Amount = order.TotalAmount,
            PaymentMethod = paymentMethod,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        db.Payments.Add(payment);

        await db.SaveChangesAsync();

        return MapToDto(payment);
    }

    // =========================================
    // GET PAYMENT BY ORDER
    // =========================================

    public async Task<PaymentDto?> GetByOrderIdAsync(
        int orderId,
        string userId)
    {
        var payment = await db.Payments
            .Include(x => x.Order)
            .FirstOrDefaultAsync(x =>
                x.OrderId == orderId &&
                x.Order.UserId == userId);

        return payment is null
            ? null
            : MapToDto(payment);
    }

    // =========================================
    // UPDATE PAYMENT STATUS
    // =========================================
      public async Task<bool> UpdateStatusAsync(int paymentId,string status)
     {
       var allowedStatuses = new[]
       {
           "Pending",
           "Paid",
           "Failed",
           "Cancelled"
       };
   
       if (string.IsNullOrWhiteSpace(status))
       {
           throw new ArgumentException(
               "Payment status is required."
           );
       }
   
       status = status.Trim();
   
       if (!allowedStatuses.Contains(status))
       {
           throw new ArgumentException(
               $"Invalid payment status. Allowed statuses: {string.Join(", ", allowedStatuses)}"
           );
       }
   
       var payment = await db.Payments
           .FirstOrDefaultAsync(x => x.Id == paymentId);
   
       if (payment is null)
       {
           return false;
       }
   
       var currentStatus = payment.Status;
   
       if (currentStatus == status)
       {
           return true;
       }
   
       // Paid payment cannot be changed manually
       if (currentStatus == "Paid")
       {
           throw new ArgumentException(
               $"Payment #{payment.Id} is already Paid and cannot be changed."
           );
       }
   
       // Failed payment cannot be changed
       if (currentStatus == "Failed")
       {
           throw new ArgumentException(
               $"Payment #{payment.Id} is already Failed and cannot be changed."
           );
       }
   
       // Cancelled payment cannot be changed
       if (currentStatus == "Cancelled")
       {
           throw new ArgumentException(
               $"Payment #{payment.Id} is already Cancelled and cannot be changed."
           );
       }
   
       // Pending can only be moved to Failed or Cancelled manually.
       // Paid is handled by Razorpay verification
       // or COD delivery flow.
       var validTransition = currentStatus switch
       {
           "Pending" =>
               status == "Failed" ||
               status == "Cancelled",
   
           _ => false
       };
   
       if (!validTransition)
       {
           throw new ArgumentException(
               $"Payment #{payment.Id} cannot move from '{currentStatus}' to '{status}'."
           );
       }
   
       payment.Status = status;
   
       await db.SaveChangesAsync();
   
       return true;
     }

    // =========================================
    // VERIFY RAZORPAY PAYMENT
    // =========================================

    public async Task<bool> VerifyRazorpayPaymentAsync(VerifyRazorpayPaymentDto dto,string userId)
    {
        // -----------------------------------------
        // 1. Basic validation
        // -----------------------------------------

        if (string.IsNullOrWhiteSpace(dto.RazorpayOrderId) ||
            string.IsNullOrWhiteSpace(dto.RazorpayPaymentId) ||
            string.IsNullOrWhiteSpace(dto.RazorpaySignature))
        {
            return false;
        }

        // -----------------------------------------
        // 2. Find user's order
        // -----------------------------------------

        var order = await db.Orders
            .FirstOrDefaultAsync(x =>
                x.Id == dto.OrderId &&
                x.UserId == userId);

        if (order is null)
        {
            return false;
        }

        // Cancelled order ka payment verify nahi hoga.
        // (Agar paisa kat chuka hai to webhook / manual refund se handle hoga.)
        if (string.Equals(order.Status, "Cancelled",
                StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // -----------------------------------------
        // 3. Find payment for this order
        // -----------------------------------------

        var payment = await db.Payments
            .FirstOrDefaultAsync(x =>
                x.OrderId == dto.OrderId);

        if (payment is null)
        {
            return false;
        }

        // -----------------------------------------
        // 4. Verify Razorpay Order ID
        // -----------------------------------------

        if (string.IsNullOrWhiteSpace(payment.RazorpayOrderId) ||
            payment.RazorpayOrderId != dto.RazorpayOrderId)
        {
            return false;
        }

        // Already Paid hai (verify ya webhook se) to dobara kuch overwrite nahi karna.
        if (payment.Status == "Paid")
        {
            return true;
        }

        // -----------------------------------------
        // 5. Get Razorpay Secret
        // -----------------------------------------

        var keySecret =
            configuration["Razorpay:KeySecret"];

        if (string.IsNullOrWhiteSpace(keySecret))
        {
            throw new InvalidOperationException(
                "Razorpay configuration is missing.");
        }

        // -----------------------------------------
        // 6. Create signature payload
        // -----------------------------------------

        var payload =
            $"{payment.RazorpayOrderId}|{dto.RazorpayPaymentId}";

        // -----------------------------------------
        // 7. Generate HMAC SHA256
        // -----------------------------------------

        using var hmac =
            new HMACSHA256(
                Encoding.UTF8.GetBytes(keySecret));

        var hash =
            hmac.ComputeHash(
                Encoding.UTF8.GetBytes(payload));

        var generatedSignature =
            Convert.ToHexString(hash)
                .ToLowerInvariant();

        // -----------------------------------------
        // 8. Compare signatures securely
        // -----------------------------------------

        var signaturesMatch =
            CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(generatedSignature),
                Encoding.UTF8.GetBytes(
                    dto.RazorpaySignature.ToLowerInvariant()
                )
            );

        if (!signaturesMatch)
        {
            return false;
        }

        // -----------------------------------------
        // 9. Verify amount
        // -----------------------------------------

        if (payment.Amount != order.TotalAmount)
        {
            return false;
        }

        // -----------------------------------------
        // 10. Mark payment as Paid
        // -----------------------------------------

        payment.RazorpayPaymentId =
            dto.RazorpayPaymentId;

        payment.RazorpaySignature =
            dto.RazorpaySignature;

        payment.Status = "Paid";

        payment.PaymentMethod = "Razorpay";

        await db.SaveChangesAsync();

        return true;
    }

    // =========================================
    // MAP PAYMENT TO DTO
    // =========================================

    private static PaymentDto MapToDto(
        Payment payment)
    {
        return new PaymentDto(
            payment.Id,
            payment.OrderId,
            payment.Amount,
            payment.PaymentMethod,
            payment.Status,
            payment.CreatedAt
        );
    }
}