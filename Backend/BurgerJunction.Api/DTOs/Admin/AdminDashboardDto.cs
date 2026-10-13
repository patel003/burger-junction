namespace BurgerJunction.Api.DTOs.Admin;

public class AdminDashboardDto
{
    // Summary Cards
    public int TotalOrders { get; set; }
    public int TotalProducts { get; set; }
    public int TotalCustomers { get; set; }
    public decimal TotalRevenue { get; set; }

    // Revenue Overview
    public List<RevenueOverviewDto> RevenueOverview { get; set; } = [];

    // Order Status
    public List<OrderStatusSummaryDto> OrderStatus { get; set; } = [];

    // Recent Orders
    public List<RecentOrderDto> RecentOrders { get; set; } = [];

    // Top Selling Products
    public List<TopSellingProductDto> TopSellingProducts { get; set; } = [];

    // Recent Customers
    public List<RecentCustomerDto> RecentCustomers { get; set; } = [];
}

public class RevenueOverviewDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
}

public class OrderStatusSummaryDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class RecentOrderDto
{
    public int OrderId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class TopSellingProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal Revenue { get; set; }
}

public class RecentCustomerDto
{
    public string UserId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}