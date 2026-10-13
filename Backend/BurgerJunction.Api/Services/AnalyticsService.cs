using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Admin;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class AnalyticsService(AppDbContext db)
{
    public async Task<AnalyticsDto> GetAnalyticsAsync()
    {
        var today = DateTime.UtcNow.Date;

        var tomorrow = today.AddDays(1);

        var monthStart = new DateTime(
            today.Year,
            today.Month,
            1);

        var nextMonth = monthStart.AddMonths(1);

        var orders = db.Orders
            .AsNoTracking();

        var todayOrders = orders
            .Where(x =>
                x.CreatedAt >= today &&
                x.CreatedAt < tomorrow &&
                x.Status != "Cancelled");

        var monthlyOrders = orders
            .Where(x =>
                x.CreatedAt >= monthStart &&
                x.CreatedAt < nextMonth &&
                x.Status != "Cancelled");

        var totalOrders = await orders.CountAsync();

        var deliveredOrders = await orders
            .CountAsync(x => x.Status == "Delivered");

        var cancelledOrders = await orders
            .CountAsync(x => x.Status == "Cancelled");

        var pendingOrders = await orders
            .CountAsync(x => x.Status == "Pending");

        var confirmedOrders = await orders
            .CountAsync(x => x.Status == "Confirmed");

        var preparingOrders = await orders
            .CountAsync(x => x.Status == "Preparing");

        var outForDeliveryOrders = await orders
            .CountAsync(x => x.Status == "Out for Delivery");

        var todaySales =
            await todayOrders
                .SumAsync(x => (decimal?)x.TotalAmount) ?? 0;

        var monthlySales =
            await monthlyOrders
                .SumAsync(x => (decimal?)x.TotalAmount) ?? 0;

        var averageOrderValue =
            totalOrders == 0
                ? 0
                : await orders
                    .Where(x => x.Status != "Cancelled")
                    .AverageAsync(x => (decimal?)x.TotalAmount) ?? 0;

        return new AnalyticsDto
        {
            TodaySales = todaySales,
            MonthlySales = monthlySales,
            AverageOrderValue = averageOrderValue,
            TotalOrders = totalOrders,
            DeliveredOrders = deliveredOrders,
            CancelledOrders = cancelledOrders,
            PendingOrders = pendingOrders,
           ConfirmedOrders = confirmedOrders,
           PreparingOrders = preparingOrders,
           OutForDeliveryOrders = outForDeliveryOrders
        };
    }
}