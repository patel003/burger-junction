namespace BurgerJunction.Api.DTOs.Products;

public record ProductDto(
    int Id,
    int CategoryId,
    string CategoryName,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    int StockQuantity,
    int LowStockThreshold,
    bool IsAvailable,
    bool IsVeg);

public record CreateProductDto(
    int CategoryId,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    int StockQuantity = 0,
    int LowStockThreshold = 5,
    bool IsAvailable = true,
    bool IsVeg = true);

public record UpdateProductDto(
    int CategoryId,
    string Name,
    string Description,
    decimal Price,
    string ImageUrl,
    int StockQuantity,
    int LowStockThreshold,
    bool IsAvailable = true,
    bool IsVeg = true);