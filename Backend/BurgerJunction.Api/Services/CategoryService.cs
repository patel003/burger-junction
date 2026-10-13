using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Categories;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class CategoryService(AppDbContext db) : ICategoryService
{
    public async Task<List<CategoryDto>> GetAllAsync()
    {
        return await db.Categories
            .OrderBy(x => x.Id)
            .Select(x => new CategoryDto(
                x.Id,
                x.Name,
                x.Products.Count,
                x.IsActive
            ))
            .ToListAsync();
    }

    public async Task<CategoryDto?> GetByIdAsync(int id)
    {
        return await db.Categories
            .Where(x => x.Id == id)
            .Select(x => new CategoryDto(
                x.Id,
                x.Name,
                x.Products.Count,
                x.IsActive
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<CategoryDto> CreateAsync(
        CategoryRequestDto dto)
    {
        var name = dto.Name.Trim();

        var exists = await db.Categories
            .AnyAsync(x => x.Name.ToLower() == name.ToLower());

        if (exists)
        {
            throw new InvalidOperationException(
                "Category already exists."
            );
        }

        var category = new Category
        {
            Name = name,
            IsActive = dto.IsActive
        };

        db.Categories.Add(category);

        await db.SaveChangesAsync();

        return new CategoryDto(
            category.Id,
            category.Name,
            0,
            category.IsActive
        );
    }

   public async Task<CategoryDto?> UpdateAsync(
    int id,
    CategoryRequestDto dto)
{
    var category = await db.Categories
        .Include(x => x.Products)
        .FirstOrDefaultAsync(x => x.Id == id);

    if (category == null)
    {
        return null;
    }

    var name = dto.Name.Trim();

    var exists = await db.Categories
        .AnyAsync(x =>
            x.Id != id &&
            x.Name.ToLower() == name.ToLower()
        );

    if (exists)
    {
        throw new InvalidOperationException(
            "Category already exists."
        );
    }

    category.Name = name;
    category.IsActive = dto.IsActive;

    await db.SaveChangesAsync();

    return new CategoryDto(
        category.Id,
        category.Name,
        category.Products.Count,
        category.IsActive
    );
}

    public async Task<bool> DeleteAsync(int id)
    {
        var category = await db.Categories
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (category == null)
        {
            return false;
        }

        if (category.Products.Any())
        {
            throw new InvalidOperationException(
                "Cannot delete this category because products are assigned to it."
            );
        }

        db.Categories.Remove(category);

        await db.SaveChangesAsync();

        return true;
    }
}