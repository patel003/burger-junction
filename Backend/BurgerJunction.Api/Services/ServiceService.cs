using BurgerJunction.Api.Data;
using BurgerJunction.Api.DTOs.Services;
using BurgerJunction.Api.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class ServiceService(AppDbContext db) : IServiceService
{
    public async Task<List<ServiceDto>> GetAllAsync()
    {
        return await db.Services
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ServiceDto(
                x.Id,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.IsActive,
                x.CreatedAt
            ))
            .ToListAsync();
    }


     public async Task<List<ServiceDto>> GetActiveAsync()
     {
         return await db.Services
             .AsNoTracking()
             .Where(x => x.IsActive)
             .OrderByDescending(x => x.CreatedAt)
             .Select(x => new ServiceDto(
                 x.Id,
                 x.Name,
                 x.Description,
                 x.Price,
                 x.ImageUrl,
                 x.IsActive,
                 x.CreatedAt
             ))
             .ToListAsync();
     }

     
    public async Task<ServiceDto?> GetByIdAsync(int id)
    {
        return await db.Services
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ServiceDto(
                x.Id,
                x.Name,
                x.Description,
                x.Price,
                x.ImageUrl,
                x.IsActive,
                x.CreatedAt
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<ServiceDto> CreateAsync(ServiceRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Service name is required.");

        if (dto.Price < 0)
            throw new ArgumentException("Price cannot be negative.");

        var service = new BurgerJunction.Api.Models.Service
        {
            Name = dto.Name.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Price = dto.Price,
            ImageUrl = dto.ImageUrl?.Trim() ?? string.Empty,
            IsActive = dto.IsActive
        };

        db.Services.Add(service);
        await db.SaveChangesAsync();

        return (await GetByIdAsync(service.Id))!;
    }

    public async Task<ServiceDto?> UpdateAsync(
        int id,
        ServiceRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Service name is required.");

        if (dto.Price < 0)
            throw new ArgumentException("Price cannot be negative.");

        var service = await db.Services.FindAsync(id);

        if (service is null)
            return null;

        service.Name = dto.Name.Trim();
        service.Description = dto.Description?.Trim() ?? string.Empty;
        service.Price = dto.Price;
        service.ImageUrl = dto.ImageUrl?.Trim() ?? string.Empty;
        service.IsActive = dto.IsActive;

        await db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var service = await db.Services.FindAsync(id);

        if (service is null)
            return false;

        db.Services.Remove(service);
        await db.SaveChangesAsync();

        return true;
    }
}