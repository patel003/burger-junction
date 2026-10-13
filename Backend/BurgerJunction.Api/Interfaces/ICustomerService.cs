using BurgerJunction.Api.DTOs.Customers;

namespace BurgerJunction.Api.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerDto>> GetAllAsync();
}