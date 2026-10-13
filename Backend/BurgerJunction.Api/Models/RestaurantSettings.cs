namespace BurgerJunction.Api.Models;

public class RestaurantSettings
{
    public int Id { get; set; }

    public string RestaurantName { get; set; } = "Burger Junction";

    public string Currency { get; set; } = "INR";

    public bool IsOrderingEnabled { get; set; } = true;

    public bool IsOnlineOrderingEnabled { get; set; } = true;
}