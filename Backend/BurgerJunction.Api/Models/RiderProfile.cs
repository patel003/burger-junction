namespace BurgerJunction.Api.Models;

public class RiderProfile
{
    public int Id { get; set; }

    // Identity ApplicationUser Id
    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;

    public string VehicleNumber { get; set; } = string.Empty;

    // Admin decides how much rider earns per completed delivery
    public decimal EarningPerDelivery { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public bool IsOnline { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}