using BurgerJunction.Api.Data;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class RestaurantSettingsService : IRestaurantSettingsService
{
    private readonly AppDbContext _context;

    public RestaurantSettingsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantSettings> GetAsync()
    {
        var settings = await _context.RestaurantSettings
            .FirstOrDefaultAsync();

        if (settings != null)
        {
            return settings;
        }

        settings = new RestaurantSettings
        {
            RestaurantName = "Burger Junction",
            Currency = "INR",
            IsOrderingEnabled = true,
            IsOnlineOrderingEnabled = true
        };

        _context.RestaurantSettings.Add(settings);
        await _context.SaveChangesAsync();

        return settings;
    }

    public async Task<RestaurantSettings> UpdateAsync(
        RestaurantSettings settings)
    {
        var existingSettings = await _context.RestaurantSettings
            .FirstOrDefaultAsync();

        if (existingSettings == null)
        {
            _context.RestaurantSettings.Add(settings);
        }
        else
        {
            existingSettings.RestaurantName = settings.RestaurantName;
            existingSettings.Currency = settings.Currency;
            existingSettings.IsOrderingEnabled = settings.IsOrderingEnabled;
            existingSettings.IsOnlineOrderingEnabled =
                settings.IsOnlineOrderingEnabled;
        }

        await _context.SaveChangesAsync();

        return existingSettings ?? settings;
    }
}