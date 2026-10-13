namespace BurgerJunction.Api.DTOs.Admin;

public class AnalyticsDto
{
    public decimal TodaySales { get; set; }

    public decimal MonthlySales { get; set; }

    public decimal AverageOrderValue { get; set; }

    public int TotalOrders { get; set; }

    public int DeliveredOrders { get; set; }

    public int CancelledOrders { get; set; }

    public int PendingOrders { get; set; }

    public int ConfirmedOrders { get; set; }

    public int PreparingOrders { get; set; }

    public int OutForDeliveryOrders { get; set; }
}