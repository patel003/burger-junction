using BurgerJunction.Api.DTOs.Inventory;

namespace BurgerJunction.Api.Interfaces;

public interface IInventoryService
{
    Task<List<AdminInventoryDto>> GetAllAsync();

    Task<AdminInventoryDto?> GetAsync(int id);

    Task<AdminInventoryDto?> UpdateStockAsync(
        int id,
        UpdateStockDto dto);
}