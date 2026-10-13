using BurgerJunction.Api.DTOs.Products;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(IProductService service) : ControllerBase
{
    // =========================================
    // PUBLIC / CUSTOMER
    // =========================================

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await service.GetAllAsync());
    }

    [HttpGet("category/{categoryId:int}")]
    public async Task<IActionResult> GetByCategory(int categoryId)
    {
        return Ok(await service.GetByCategoryAsync(categoryId));
    }

    // =========================================
// CUSTOMER MENU
// =========================================

[HttpGet("menu")]
public async Task<IActionResult> GetCustomerMenu()
{
    return Ok(await service.GetCustomerAllAsync());
}

[HttpGet("menu/category/{categoryId:int}")]
public async Task<IActionResult> GetCustomerMenuByCategory(int categoryId)
{
    return Ok(
        await service.GetCustomerByCategoryAsync(categoryId)
    );
}

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var product = await service.GetAsync(id);

        return product is null
            ? NotFound()
            : Ok(product);
    }


    // =========================================
    // ADMIN ONLY
    // =========================================

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateProductDto dto)
    {
        return Ok(await service.CreateAsync(dto));
    }


    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateProductDto dto)
    {
        var result = await service.UpdateAsync(id, dto);

        return result is null
            ? NotFound()
            : Ok(result);
    }


    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        return await service.DeleteAsync(id)
            ? NoContent()
            : NotFound();
    }
}