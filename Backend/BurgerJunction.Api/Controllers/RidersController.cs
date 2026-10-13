using BurgerJunction.Api.Data;
using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/riders")]
[Authorize(Roles = "Admin")]
public class RidersController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db
) : ControllerBase
{
    // =========================
    // CREATE RIDER
    // =========================

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateRiderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest(new
            {
                message = "Full name is required."
            });

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new
            {
                message = "Email is required."
            });

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(new
            {
                message = "Phone number is required."
            });

        if (string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new
            {
                message = "Password is required."
            });

        if (request.EarningPerDelivery < 0)
            return BadRequest(new
            {
                message = "Earning per delivery cannot be negative."
            });

        var existingUser =
            await userManager.FindByEmailAsync(
                request.Email.Trim());

        if (existingUser != null)
        {
            return Conflict(new
            {
                message = "A user with this email already exists."
            });
        }

        await using var transaction =
            await db.Database.BeginTransactionAsync();

        try
        {
            var riderUser = new ApplicationUser
            {
                UserName = request.Email.Trim(),
                Email = request.Email.Trim(),
                FullName = request.FullName.Trim(),
                PhoneNumber = request.PhoneNumber.Trim(),
                EmailConfirmed = true
            };

            var createResult =
                await userManager.CreateAsync(
                    riderUser,
                    request.Password);

            if (!createResult.Succeeded)
            {
                var errors = createResult.Errors
                    .Select(x => x.Description)
                    .ToList();

                return BadRequest(new
                {
                    message = "Rider account creation failed.",
                    errors
                });
            }

            var roleResult =
                await userManager.AddToRoleAsync(
                    riderUser,
                    "Rider");

            if (!roleResult.Succeeded)
            {
                var errors = roleResult.Errors
                    .Select(x => x.Description)
                    .ToList();

                await userManager.DeleteAsync(riderUser);

                return BadRequest(new
                {
                    message = "Rider role assignment failed.",
                    errors
                });
            }

            var riderProfile = new RiderProfile
            {
                UserId = riderUser.Id,

                VehicleNumber =
                    request.VehicleNumber?.Trim()
                    ?? string.Empty,

                EarningPerDelivery =
                    request.EarningPerDelivery,

                IsActive = true,

                IsOnline = false
            };

            db.RiderProfiles.Add(riderProfile);

            await db.SaveChangesAsync();

            await transaction.CommitAsync();

            return Ok(new
            {
                message = "Rider created successfully.",

                riderId = riderUser.Id,

                name = riderUser.FullName,

                email = riderUser.Email,

                phoneNumber = riderUser.PhoneNumber,

                vehicleNumber =
                    riderProfile.VehicleNumber,

                earningPerDelivery =
                    riderProfile.EarningPerDelivery,

                isActive =
                    riderProfile.IsActive,

                isOnline =
                    riderProfile.IsOnline
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // =========================
    // GET ALL RIDERS
    // =========================

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var riders = await db.RiderProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .OrderBy(x => x.User.FullName)
            .Select(x => new
            {
                id = x.Id,

                userId = x.UserId,

                name = x.User.FullName,

                email = x.User.Email,

                phoneNumber = x.User.PhoneNumber,

                vehicleNumber = x.VehicleNumber,

                earningPerDelivery =
                    x.EarningPerDelivery,

                isActive = x.IsActive,

                isOnline = x.IsOnline,

                createdAt = x.CreatedAt
            })
            .ToListAsync();

        return Ok(riders);
    }

    // =========================
    // UPDATE RIDER ACTIVE STATUS
    // =========================

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateRiderStatusRequest request)
    {
        var rider = await db.RiderProfiles
            .FirstOrDefaultAsync(x => x.Id == id);

        if (rider == null)
        {
            return NotFound(new
            {
                message = "Rider not found."
            });
        }

        rider.IsActive = request.IsActive;

        // Inactive rider automatically offline
        if (!rider.IsActive)
        {
            rider.IsOnline = false;
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            message = rider.IsActive
                ? "Rider activated successfully."
                : "Rider deactivated successfully.",

            riderId = rider.Id,

            isActive = rider.IsActive,

            isOnline = rider.IsOnline
        });
    }

    // =========================
    // UPDATE EARNING PER DELIVERY
    // =========================

    [HttpPut("{id:int}/earning-rate")]
    public async Task<IActionResult> UpdateEarningRate(
        int id,
        UpdateRiderEarningRequest request)
    {
        if (request.EarningPerDelivery < 0)
        {
            return BadRequest(new
            {
                message =
                    "Earning per delivery cannot be negative."
            });
        }

        var rider = await db.RiderProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (rider == null)
        {
            return NotFound(new
            {
                message = "Rider not found."
            });
        }

        rider.EarningPerDelivery =
            request.EarningPerDelivery;

        await db.SaveChangesAsync();

        return Ok(new
        {
            message =
                "Rider earning rate updated successfully.",

            riderId = rider.Id,

            riderName = rider.User.FullName,

            earningPerDelivery =
                rider.EarningPerDelivery
        });
    }
}


// =========================
// REQUEST DTOs
// =========================

public record CreateRiderRequest(
    string FullName,
    string Email,
    string PhoneNumber,
    string Password,
    string? VehicleNumber,
    decimal EarningPerDelivery
);

public record UpdateRiderStatusRequest(
    bool IsActive
);

public record UpdateRiderEarningRequest(
    decimal EarningPerDelivery
);