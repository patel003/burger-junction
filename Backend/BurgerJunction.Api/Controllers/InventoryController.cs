using BurgerJunction.Api.DTOs.Inventory;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/inventory")]
[Authorize(Roles = "Admin")]
public class InventoryController(IInventoryService service)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await service.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var result = await service.GetAsync(id);

        return result is null
            ? NotFound()
            : Ok(result);
    }

    [HttpPut("{id:int}/stock")]
    public async Task<IActionResult> UpdateStock(
        int id,
        [FromBody] UpdateStockDto dto)
    {
        var result = await service.UpdateStockAsync(id, dto);

        return result is null
            ? NotFound()
            : Ok(result);
    }
}