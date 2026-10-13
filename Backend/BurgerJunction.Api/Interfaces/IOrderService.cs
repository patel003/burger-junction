using BurgerJunction.Api.DTOs.Orders;

namespace BurgerJunction.Api.Interfaces;

public interface IOrderService
{
    Task<OrderDto> CreateAsync(
        CreateOrderDto dto,
        string? userId = null);

    Task<List<OrderDto>> GetAllAsync();

    Task<List<OrderDto>> GetMyOrdersAsync(string userId);

   Task<OrderDto?> GetAsync(int id,string? userId = null);

    Task<OrderDto?> GetMyOrderAsync( int id, string userId);

    Task<bool> UpdateStatusAsync( int id, string status);

    Task<bool> DeleteAsync(int id);

    Task<int> DeleteAllAsync();
}