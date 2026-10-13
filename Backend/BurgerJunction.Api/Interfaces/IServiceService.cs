using BurgerJunction.Api.DTOs.Services;

namespace BurgerJunction.Api.Interfaces;

public interface IServiceService
{
    Task<List<ServiceDto>> GetAllAsync();
    
    Task<List<ServiceDto>> GetActiveAsync();

    Task<ServiceDto?> GetByIdAsync(int id);

    Task<ServiceDto> CreateAsync(ServiceRequestDto dto);

    Task<ServiceDto?> UpdateAsync(int id, ServiceRequestDto dto);

    Task<bool> DeleteAsync(int id);
}