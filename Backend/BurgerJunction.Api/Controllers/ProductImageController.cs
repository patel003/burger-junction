using BurgerJunction.Api.DTOs.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/products")]
[Authorize(Roles = "Admin")]
public class ProductImageController(IWebHostEnvironment environment)
    : ControllerBase
{
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(
        IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new
            {
                message = "Please select an image."
            });

        var allowedExtensions = new[]
        {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        };

        var extension =
            Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(extension))
            return BadRequest(new
            {
                message = "Only JPG, JPEG, PNG and WEBP images are allowed."
            });

        const long maxFileSize = 5 * 1024 * 1024;

        if (file.Length > maxFileSize)
            return BadRequest(new
            {
                message = "Image size cannot exceed 5 MB."
            });

        var uploadsFolder = Path.Combine(
            environment.WebRootPath ?? Path.Combine(
                environment.ContentRootPath,
                "wwwroot"
            ),
            "uploads",
            "products"
        );

        Directory.CreateDirectory(uploadsFolder);

        var fileName =
            $"{Guid.NewGuid():N}{extension}";

        var filePath =
            Path.Combine(uploadsFolder, fileName);

        await using var stream =
            new FileStream(
                filePath,
                FileMode.Create
            );

        await file.CopyToAsync(stream);

        var imageUrl =
            $"{Request.Scheme}://{Request.Host}/uploads/products/{fileName}";

        return Ok(
            new UploadProductImageResponse(imageUrl)
        );
    }
}