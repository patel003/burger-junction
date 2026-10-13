using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Products;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class ProductService(AppDbContext db) : IProductService
{
    public async Task<List<ProductDto>> GetAllAsync() =>
        await db.Products
            .Include(x => x.Category)
            .OrderBy(x => x.Id)
            .Select(x => new ProductDto(
                x.Id,
                x.CategoryId,
                x.Category!.Name,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.StockQuantity,
                x.LowStockThreshold,
                x.IsAvailable,
                x.IsVeg))
            .ToListAsync();

    public async Task<List<ProductDto>> GetByCategoryAsync(int categoryId) =>
        await db.Products
            .Include(x => x.Category)
            .Where(x => x.CategoryId == categoryId)
            .Select(x => new ProductDto(
                x.Id,
                x.CategoryId,
                x.Category!.Name,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.StockQuantity,
                x.LowStockThreshold,
                x.IsAvailable,
                x.IsVeg))
            .ToListAsync();


            
    // =========================================
// CUSTOMER MENU
// =========================================

    public async Task<List<ProductDto>> GetCustomerAllAsync() =>
    await db.Products
        .Include(x => x.Category)
        .Where(x => x.Category != null && x.Category.IsActive)
        .OrderBy(x => x.Id)
        .Select(x => new ProductDto(
            x.Id,
            x.CategoryId,
            x.Category!.Name,
            x.Name,
            x.Description,
            x.Price,
            x.ImageUrl,
            x.StockQuantity,
            x.LowStockThreshold,
            x.IsAvailable,
            x.IsVeg))
        .ToListAsync();


    public async Task<List<ProductDto>> GetCustomerByCategoryAsync(int categoryId) =>
    await db.Products
        .Include(x => x.Category)
        .Where(x =>
            x.CategoryId == categoryId &&
            x.Category != null &&
            x.Category.IsActive)
        .OrderBy(x => x.Id)
        .Select(x => new ProductDto(
            x.Id,
            x.CategoryId,
            x.Category!.Name,
            x.Name,
            x.Description,
            x.Price,
            x.ImageUrl,
            x.StockQuantity,
            x.LowStockThreshold,
            x.IsAvailable,
            x.IsVeg))
        .ToListAsync();

    public async Task<ProductDto?> GetAsync(int id) =>
        await db.Products
            .Include(x => x.Category)
            .Where(x => x.Id == id)
            .Select(x => new ProductDto(
                x.Id,
                x.CategoryId,
                x.Category!.Name,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.StockQuantity,
                x.LowStockThreshold,
                x.IsAvailable,
                x.IsVeg))
            .FirstOrDefaultAsync();

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            CategoryId = dto.CategoryId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            ImageUrl = dto.ImageUrl,
            StockQuantity = dto.StockQuantity,
            LowStockThreshold = dto.LowStockThreshold,
            IsAvailable = dto.IsAvailable,
            IsVeg = dto.IsVeg
        };

        db.Products.Add(product);
        await db.SaveChangesAsync();

        return (await GetAsync(product.Id))!;
    }

    public async Task<ProductDto?> UpdateAsync(int id, UpdateProductDto dto)
    {
        var product = await db.Products.FindAsync(id);

        if (product is null)
            return null;

        product.CategoryId = dto.CategoryId;
        product.Name = dto.Name;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.ImageUrl = dto.ImageUrl;
        product.StockQuantity = dto.StockQuantity;
        product.LowStockThreshold = dto.LowStockThreshold;
        product.IsAvailable = dto.IsAvailable;
        product.IsVeg = dto.IsVeg;  
        await db.SaveChangesAsync();

        return await GetAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var product = await db.Products.FindAsync(id);

        if (product is null)
            return false;

        db.Products.Remove(product);
        await db.SaveChangesAsync();

        return true;
    }


}