using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Inventory;
using BurgerJunction.Api.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class InventoryService(AppDbContext db) : IInventoryService
{
    public async Task<List<AdminInventoryDto>> GetAllAsync()
    {
        return await db.Products
            .OrderBy(x => x.StockQuantity)
            .Select(x => new AdminInventoryDto(
                x.Id,
                x.Name,
                x.Price,
                x.StockQuantity,
                x.LowStockThreshold,
                x.IsAvailable,
                x.StockQuantity == 0
                    ? "Out of Stock"
                    : x.StockQuantity <= x.LowStockThreshold
                        ? "Low Stock"
                        : "In Stock"
            ))
            .ToListAsync();
    }

    public async Task<AdminInventoryDto?> GetAsync(int id)
    {
        return await db.Products
            .Where(x => x.Id == id)
            .Select(x => new AdminInventoryDto(
                x.Id,
                x.Name,
                x.Price,
                x.StockQuantity,
                x.LowStockThreshold,
                x.IsAvailable,
                x.StockQuantity == 0
                    ? "Out of Stock"
                    : x.StockQuantity <= x.LowStockThreshold
                        ? "Low Stock"
                        : "In Stock"
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<AdminInventoryDto?> UpdateStockAsync(
        int id,
        UpdateStockDto dto)
    {
        if (dto.StockQuantity < 0)
            throw new ArgumentException(
                "Stock quantity cannot be negative.");

        if (dto.LowStockThreshold < 0)
            throw new ArgumentException(
                "Low stock threshold cannot be negative.");

        var product = await db.Products.FindAsync(id);

        if (product is null)
            return null;

        product.StockQuantity = dto.StockQuantity;
        product.LowStockThreshold = dto.LowStockThreshold;

        product.IsAvailable = dto.StockQuantity > 0;

        await db.SaveChangesAsync();

        return await GetAsync(id);
    }
}