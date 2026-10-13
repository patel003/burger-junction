using BurgerJunction.Api.DTOs.Services;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/services")]
[Authorize(Roles = "Admin")]
public class ServicesController(
    IServiceService service
) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await service.GetAllAsync());
    }


    [AllowAnonymous]
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
   {
    return Ok(await service.GetActiveAsync());
 } 
 
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await service.GetByIdAsync(id);

        return result is null
            ? NotFound(new { message = "Service not found." })
            : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] ServiceRequestDto dto)
    {
        try
        {
            var result = await service.CreateAsync(dto);

            return CreatedAtAction(
                nameof(GetById),
                new { id = result.Id },
                result
            );
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] ServiceRequestDto dto)
    {
        try
        {
            var result = await service.UpdateAsync(id, dto);

            return result is null
                ? NotFound(new { message = "Service not found." })
                : Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await service.DeleteAsync(id);

        return deleted
            ? NoContent()
            : NotFound(new { message = "Service not found." });
    }
}