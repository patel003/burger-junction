using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Orders;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;
using BurgerJunction.Api.Services;

namespace BurgerJunction.Api.Services;

public class OrderService(AppDbContext db, ICouponService couponService, IRestaurantSettingsService restaurantSettingsService, NotificationService notificationService) : IOrderService
{
    public async Task<OrderDto> CreateAsync(CreateOrderDto dto, string? userId = null)
    {
        var settings = await restaurantSettingsService.GetAsync();

        if (!settings.IsOrderingEnabled)
        {
            throw new ArgumentException(
                "Restaurant is currently not accepting new orders."
            );
        }

        if (!settings.IsOnlineOrderingEnabled)
        {
            throw new ArgumentException(
                "Online ordering is currently disabled."
            );
        }

        // Live tracking ke liye delivery pin zaroori hai.
        // (Agar admin se manual orders bhi banate ho to ye check hata dena.)
        if (!dto.DeliveryLatitude.HasValue || !dto.DeliveryLongitude.HasValue)
        {
            throw new ArgumentException(
                "Please pin your delivery location on the map.");
        }

        await using var transaction =
            await db.Database.BeginTransactionAsync(
                System.Data.IsolationLevel.Serializable);

        try
        {
            if (dto.Items is null || dto.Items.Count == 0)
            {
                throw new ArgumentException("Order must contain at least one item.");
            }

            var ids = dto.Items
                .Select(x => x.ProductId)
                .Distinct()
                .ToList();

            var products = await db.Products
                .Include(x => x.Category)
                .Where(x => ids.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id);

            var order = new Order
            {
                UserId = userId,
                CustomerName = dto.CustomerName,
                CustomerPhone = dto.CustomerPhone,
                DeliveryAddress = dto.DeliveryAddress,
                DeliveryLatitude = dto.DeliveryLatitude,
                DeliveryLongitude = dto.DeliveryLongitude,
                DiscountAmount = 0,
                CouponCode = null
            };

            decimal subtotal = 0;

            foreach (var item in dto.Items)
            {
                if (!products.TryGetValue(
                        item.ProductId,
                        out var product))
                {
                    throw new ArgumentException(
                        $"Product {item.ProductId} not found.");
                }

                if (!product.IsAvailable)
                {
                    throw new ArgumentException(
                        $"Product '{product.Name}' is currently unavailable.");
                }

                if (product.Category is null || !product.Category.IsActive)
                {
                    throw new ArgumentException(
                        $"Product '{product.Name}' is currently unavailable because its category is inactive.");
                }

                if (item.Quantity <= 0)
                {
                    throw new ArgumentException(
                        "Quantity must be greater than zero.");
                }

                if (item.Quantity > product.StockQuantity)
                {
                    throw new ArgumentException(
                        $"Only {product.StockQuantity} unit(s) of '{product.Name}' are available."
                    );
                }

                product.StockQuantity -= item.Quantity;

                if (product.StockQuantity == 0)
                {
                    product.IsAvailable = false;
                }

                order.Items.Add(new OrderItem
                {
                    ProductId = product.Id,
                    Quantity = item.Quantity,
                    Price = product.Price
                });

                subtotal += product.Price * item.Quantity;
            }

            order.TotalAmount = subtotal;

            // Apply coupon on the server
            if (!string.IsNullOrWhiteSpace(dto.CouponCode))
            {
                var couponResult =
                    await couponService.ApplyAsync(
                        new BurgerJunction.Api.DTOs.Coupons
                            .ApplyCouponRequestDto(
                                dto.CouponCode,
                                subtotal
                            )
                    );

                if (!couponResult.IsValid)
                {
                    throw new ArgumentException(
                        couponResult.Message);
                }

                var coupon = await db.Coupons
                    .FirstOrDefaultAsync(
                        x => x.Code == couponResult.Code);

                if (coupon is null)
                {
                    throw new ArgumentException(
                        "Coupon is no longer available.");
                }

                if (coupon.UsedCount >= coupon.UsageLimit)
                {
                    throw new ArgumentException(
                        "This coupon usage limit has been reached.");
                }

                order.CouponCode = coupon.Code;
                order.DiscountAmount =
                    couponResult.DiscountAmount;

                order.TotalAmount =
                    couponResult.FinalAmount;

                coupon.UsedCount++;
            }

            db.Orders.Add(order);

            await db.SaveChangesAsync();

            await transaction.CommitAsync();

            return (await GetAsync(
                order.Id,
                userId
            ))!;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<OrderDto>> GetAllAsync() => await db.Orders
        .Include(x => x.Items)
        .ThenInclude(x => x.Product)
        .Include(x => x.Payment)
        .OrderByDescending(x => x.CreatedAt)
        .Select(ToDto())
        .ToListAsync();

    public async Task<List<OrderDto>> GetMyOrdersAsync(string userId) => await db.Orders
        .Include(x => x.Items)
        .ThenInclude(x => x.Product)
        .Include(x => x.Payment)
        .Include(x => x.Rider)
        .Where(x => x.UserId == userId)
        .OrderByDescending(x => x.CreatedAt)
        .Select(ToDto())
        .ToListAsync();


    public async Task<OrderDto?> GetAsync(int id, string? userId = null)
    {
        var query = db.Orders
               .Include(x => x.Items)
               .ThenInclude(x => x.Product)
               .Include(x => x.Payment)
               .Where(x => x.Id == id);

        // Customer ke liye sirf uska apna order
        if (!string.IsNullOrEmpty(userId))
        {
            query = query.Where(x => x.UserId == userId);
        }

        return await query
          .Select(ToDto())
          .FirstOrDefaultAsync();
    }


    public async Task<OrderDto?> GetMyOrderAsync(
    int id,
    string userId) =>
    await db.Orders
        .Include(x => x.Items)
        .ThenInclude(x => x.Product)
         .Include(x => x.Payment)
        .Where(x =>
            x.Id == id &&
            x.UserId == userId)
        .Select(ToDto())
        .FirstOrDefaultAsync();


    public async Task<bool> UpdateStatusAsync(int id, string status)
    {
       var allowedStatuses = new[]
      {
         "Pending",
         "Confirmed",
         "Preparing",
         "Ready for Pickup",
         "Out for Delivery",
         "Delivered",
         "Cancelled"
       };

        if (string.IsNullOrWhiteSpace(status))
            throw new ArgumentException("Order status is required.");

        status = status.Trim();

        if (!allowedStatuses.Contains(status))
        {
            throw new ArgumentException(
                $"Invalid order status. Allowed values: {string.Join(", ", allowedStatuses)}"
            );
        }

        var order = await db.Orders
            .Include(x => x.Payment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order is null)
            return false;

        var currentStatus = order.Status;

        // Same status par koi change nahi
        if (currentStatus == status)
            return true;

        // Terminal statuses
        if (currentStatus == "Delivered")
        {
            throw new ArgumentException(
                $"Order #{order.Id} is already Delivered and cannot be moved to another status."
            );
        }

        if (currentStatus == "Cancelled")
        {
            throw new ArgumentException(
                $"Order #{order.Id} is already Cancelled and cannot be moved to another status."
            );
        }

        // Valid one-way transitions
        var validTransition = currentStatus switch
        {
            "Pending" =>
                status == "Confirmed" ||
                status == "Cancelled",

            "Confirmed" =>
                status == "Preparing" ||
                status == "Cancelled",

           "Preparing" =>
                status == "Ready for Pickup" ||
                status == "Cancelled",

           "Ready for Pickup" =>
               status == "Out for Delivery",
           
           "Out for Delivery" =>
               status == "Delivered",

            _ => false
        };

        if (!validTransition)
        {
            throw new ArgumentException(
                $"Order #{order.Id} cannot move from '{currentStatus}' to '{status}'."
            );
        }

        order.Status = status;

        // COD order Delivered hone par payment Paid
        if (
            status == "Delivered" &&
            order.Payment is not null &&
            string.Equals(
                order.Payment.PaymentMethod,
                "Cash on Delivery",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            order.Payment.Status = "Paid";
        }

        await db.SaveChangesAsync();

        // Create notification for customer
        if (!string.IsNullOrEmpty(order.UserId))
        {
            var title = status switch
            {
                "Confirmed" => "Order Confirmed",
                "Preparing" => "Order Being Prepared",
                "Out for Delivery" => "Order Out for Delivery",
                "Delivered" => "Order Delivered",
                "Cancelled" => "Order Cancelled",
                _ => "Order Status Updated"
            };

            var message = status switch
            {
                "Confirmed" =>
                    $"Your order #{order.Id} has been confirmed.",

                "Preparing" =>
                    $"Your order #{order.Id} is now being prepared.",

                "Out for Delivery" =>
                    $"Your order #{order.Id} is out for delivery.",

                "Delivered" =>
                    $"Your order #{order.Id} has been delivered successfully.",

                "Cancelled" =>
                    $"Your order #{order.Id} has been cancelled.",

                _ =>
                    $"Your order #{order.Id} status is now {status}."
            };

            await notificationService.CreateAsync(
                order.UserId,
                title,
                message,
                "Order",
                order.Id
            );
        }

        return true;
    }

    private static System.Linq.Expressions.Expression<Func<Order, OrderDto>> ToDto() =>
    x => new OrderDto(
        x.Id,
        x.CustomerName,
        x.CustomerPhone,
        x.DeliveryAddress,
        x.TotalAmount,
        x.CouponCode,
        x.DiscountAmount,
        x.Status,
        x.CreatedAt,
        x.Payment != null ? x.Payment.PaymentMethod : null,
        x.Payment != null ? x.Payment.Status : null,

        x.Rider != null
            ? x.Rider.FullName
            : null,

        x.Rider != null
            ? x.Rider.PhoneNumber
            : null,

        x.Items.Select(i => new OrderItemDto(
            i.ProductId,
            i.Product!.Name,
            i.Quantity,
            i.Price
        )).ToList(),

        x.DeliveryLatitude,
        x.DeliveryLongitude,
        x.RiderLatitude,
        x.RiderLongitude,
        x.RiderLocationUpdatedAt
    );


    public async Task<bool> DeleteAsync(int id)
    {
        var order = await db.Orders
            .Include(x => x.Items)
            .Include(x => x.Payment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order is null)
            return false;

        // Payment pehle delete hoga
        if (order.Payment is not null)
        {
            db.Payments.Remove(order.Payment);
        }

        // OrderItems delete honge
        if (order.Items.Count > 0)
        {
            db.OrderItems.RemoveRange(order.Items);
        }

        // Finally Order delete hoga
        db.Orders.Remove(order);

        await db.SaveChangesAsync();

        return true;
    }


    public async Task<int> DeleteAllAsync()
    {
        var orders = await db.Orders
            .Include(x => x.Items)
            .Include(x => x.Payment)
            .ToListAsync();

        if (orders.Count == 0)
            return 0;

        foreach (var order in orders)
        {
            if (order.Payment is not null)
            {
                db.Payments.Remove(order.Payment);
            }

            if (order.Items.Count > 0)
            {
                db.OrderItems.RemoveRange(order.Items);
            }
        }

        db.Orders.RemoveRange(orders);

        await db.SaveChangesAsync();

        return orders.Count;
    }
}