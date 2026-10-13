using BurgerJunction.Api.DTOs.Categories;

namespace BurgerJunction.Api.Interfaces;

public interface ICategoryService
{
    Task<List<CategoryDto>> GetAllAsync();

    Task<CategoryDto?> GetByIdAsync(int id);

    Task<CategoryDto> CreateAsync(CategoryRequestDto dto);

    Task<CategoryDto?> UpdateAsync(
        int id,
        CategoryRequestDto dto
    );

    Task<bool> DeleteAsync(int id);
}