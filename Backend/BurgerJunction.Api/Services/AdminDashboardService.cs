using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Admin;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class AdminDashboardService(AppDbContext db) : IAdminDashboardService
{
    public async Task<AdminDashboardDto> GetDashboardAsync()
    {
        // =========================
        // SUMMARY
        // =========================

        var totalOrders =
            await db.Orders.CountAsync();

        var totalProducts =
            await db.Products.CountAsync();

        var totalCustomers =
            await db.Set<ApplicationUser>().CountAsync();

        var totalRevenue =
            await db.Orders
                .Where(x => x.Status != "Cancelled")
                .SumAsync(x => (decimal?)x.TotalAmount) ?? 0;


        // =========================
        // REVENUE OVERVIEW
        // LAST 7 DAYS
        // =========================

        var today = DateTime.UtcNow.Date;
        var startDate = today.AddDays(-6);
        var endDate = today.AddDays(1);

        var revenueData = await db.Orders
            .Where(x =>
                x.Status != "Cancelled" &&
                x.CreatedAt >= startDate &&
                x.CreatedAt < endDate)
            .GroupBy(x => x.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Revenue = g.Sum(x => x.TotalAmount)
            })
            .ToListAsync();

        var revenueOverview = Enumerable
            .Range(0, 7)
            .Select(i =>
            {
                var date = startDate.AddDays(i);

                var revenue = revenueData
                    .FirstOrDefault(x => x.Date == date);

                return new RevenueOverviewDto
                {
                    Date = date,
                    Revenue = revenue?.Revenue ?? 0
                };
            })
            .ToList();


        // =========================
        // ORDER STATUS
        // =========================

        var orderStatus = await db.Orders
            .GroupBy(x => x.Status)
            .Select(g => new OrderStatusSummaryDto
            {
                Status = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();


        // =========================
        // RECENT ORDERS
        // =========================

        var recentOrders = await db.Orders
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(5)
            .Select(x => new RecentOrderDto
            {
                OrderId = x.Id,
                CustomerName = x.CustomerName,
                TotalAmount = x.TotalAmount,
                Status = x.Status,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();


        // =========================
        // TOP SELLING PRODUCTS
        // =========================

 

var topSellingProducts =
    await (
        from item in db.OrderItems
        join order in db.Orders
            on item.OrderId equals order.Id
        join product in db.Products
            on item.ProductId equals product.Id
        where order.Status != "Cancelled"
        group item by new
        {
            item.ProductId,
            ProductName = product.Name
        }
        into g
        orderby g.Sum(x => x.Quantity) descending
        select new TopSellingProductDto
        {
            ProductId = g.Key.ProductId,
            ProductName = g.Key.ProductName,
            QuantitySold = g.Sum(x => x.Quantity),
            Revenue = g.Sum(x => x.Quantity * x.Price)
        }
    )
    .Take(5)
    .ToListAsync();


        // =========================
        // RECENT CUSTOMERS
        // =========================

        var recentCustomers = await db.Set<ApplicationUser>()
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(5)
            .Select(x => new RecentCustomerDto
            {
                UserId = x.Id,
                FullName = x.FullName,
                Email = x.Email ?? string.Empty,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();


        // =========================
        // FINAL DASHBOARD
        // =========================

        return new AdminDashboardDto
        {
            TotalOrders = totalOrders,
            TotalProducts = totalProducts,
            TotalCustomers = totalCustomers,
            TotalRevenue = totalRevenue,

            RevenueOverview = revenueOverview,
            OrderStatus = orderStatus,
            RecentOrders = recentOrders,
            TopSellingProducts = topSellingProducts,
            RecentCustomers = recentCustomers
        };
    }
}