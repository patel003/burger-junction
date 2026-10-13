using BurgerJunction.Api.DTOs.Admin;

namespace BurgerJunction.Api.Interfaces;

public interface IAdminDashboardService
{
    Task<AdminDashboardDto> GetDashboardAsync();
}