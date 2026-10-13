using BurgerJunction.Api.DTOs.Products;

namespace BurgerJunction.Api.Interfaces;

public interface IProductService
{
    Task<List<ProductDto>> GetAllAsync();
    Task<List<ProductDto>> GetByCategoryAsync(int categoryId);
    Task<List<ProductDto>> GetCustomerAllAsync();
    Task<List<ProductDto>> GetCustomerByCategoryAsync(int categoryId);
    Task<ProductDto?> GetAsync(int id);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto?> UpdateAsync(int id, UpdateProductDto dto);
    Task<bool> DeleteAsync(int id);
}
