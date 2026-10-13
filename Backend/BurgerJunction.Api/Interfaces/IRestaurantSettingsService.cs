using BurgerJunction.Api.Models;

namespace BurgerJunction.Api.Interfaces;

public interface IRestaurantSettingsService
{
    Task<RestaurantSettings> GetAsync();

    Task<RestaurantSettings> UpdateAsync(
        RestaurantSettings settings);
}