using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace BurgerJunction.Api.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(
        IServiceProvider serviceProvider)
    {
        var roleManager =
            serviceProvider.GetRequiredService<
                RoleManager<IdentityRole>>();

        var userManager =
            serviceProvider.GetRequiredService<
                UserManager<ApplicationUser>>();

        var configuration =
            serviceProvider.GetRequiredService<
                IConfiguration>();

        // =========================
        // CUSTOMER ROLE
        // =========================

        if (!await roleManager.RoleExistsAsync("Customer"))
        {
            var customerRoleResult =
                await roleManager.CreateAsync(
                    new IdentityRole("Customer")
                );

            if (!customerRoleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Customer role creation failed."
                );
            }
        }

        // =========================
        // ADMIN ROLE
        // =========================

        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            var adminRoleResult =
                await roleManager.CreateAsync(
                    new IdentityRole("Admin")
                );

            if (!adminRoleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Admin role creation failed."
                );
            }
        }

        // =========================
        // RIDER ROLE
        // =========================

        if (!await roleManager.RoleExistsAsync("Rider"))
        {
            var riderRoleResult =
                await roleManager.CreateAsync(
                    new IdentityRole("Rider")
                );

            if (!riderRoleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Rider role creation failed."
                );
            }
        }

        // =========================
        // ADMIN CONFIGURATION
        // =========================

        var adminEmail =
            configuration["Admin:Email"];

        var adminPassword =
            configuration["Admin:Password"];

        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            throw new InvalidOperationException(
                "Admin email is missing from configuration."
            );
        }

        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException(
                "Admin password is missing from configuration."
            );
        }

        // =========================
        // ADMIN USER
        // =========================

        var adminUser =
            await userManager.FindByEmailAsync(
                adminEmail
            );

        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "Burger Junction Admin",
                EmailConfirmed = true
            };

            var result =
                await userManager.CreateAsync(
                    adminUser,
                    adminPassword
                );

            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    "Admin creation failed."
                );
            }
        }

        // =========================
        // ADMIN ROLE ASSIGNMENT
        // =========================

        if (!await userManager.IsInRoleAsync(
            adminUser,
            "Admin"))
        {
            var roleResult =
                await userManager.AddToRoleAsync(
                    adminUser,
                    "Admin"
                );

            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    "Admin role assignment failed."
                );
            }
        }
    }
}