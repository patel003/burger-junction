using BurgerJunction.Api.DTOs.Customers;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class CustomerService( UserManager<ApplicationUser> userManager) : ICustomerService
{
    public async Task<List<CustomerDto>> GetAllAsync()
    {
        return await userManager.Users
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new CustomerDto(
                x.Id,
                x.FullName,
                x.Email ?? string.Empty,
                x.PhoneNumber,
                x.CreatedAt
            ))
            .ToListAsync();
    }
}

