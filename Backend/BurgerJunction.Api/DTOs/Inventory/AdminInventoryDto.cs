namespace BurgerJunction.Api.DTOs.Inventory;

public record AdminInventoryDto(
    int Id,
    string Name,
    decimal Price,
    int StockQuantity,
    int LowStockThreshold,
    bool IsAvailable,
    string StockStatus
);

public record UpdateStockDto(
    int StockQuantity,
    int LowStockThreshold
);