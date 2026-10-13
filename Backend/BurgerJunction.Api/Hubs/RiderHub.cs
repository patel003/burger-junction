
using System.Security.Claims;
using BurgerJunction.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Hubs;

[Authorize(Roles = "Rider,Admin,Customer")]
public class RiderHub : Hub
{
    private readonly AppDbContext _db;

    public RiderHub(AppDbContext db)
    {
        _db = db;
    }

    public async Task JoinUserGroup(string userId)
    {
        var currentUserId = Context.User?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        var isAdmin = Context.User?.IsInRole("Admin") == true;

        if (string.IsNullOrWhiteSpace(currentUserId) ||
            (!isAdmin && currentUserId != userId))
        {
            throw new HubException(
                "You cannot join this user group.");
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            $"user-{userId}");
    }

    public async Task LeaveUserGroup(string userId)
    {
        var currentUserId = Context.User?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        var isAdmin = Context.User?.IsInRole("Admin") == true;

        if (string.IsNullOrWhiteSpace(currentUserId) ||
            (!isAdmin && currentUserId != userId))
        {
            throw new HubException(
                "You cannot leave this user group.");
        }

        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            $"user-{userId}");
    }

    public async Task JoinOrderTrackingGroup(int orderId)
    {
        var userId = Context.User?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId))
            throw new HubException("User is not authenticated.");

        var order = await _db.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == orderId);

        if (order == null)
            throw new HubException("Order not found.");

        var isAdmin =
            Context.User?.IsInRole("Admin") == true;

        var isAssignedRider =
            Context.User?.IsInRole("Rider") == true &&
            order.RiderId == userId;

        var isOrderCustomer =
            Context.User?.IsInRole("Customer") == true &&
            order.UserId == userId;

        if (!isAdmin && !isAssignedRider && !isOrderCustomer)
        {
            throw new HubException(
                "You are not authorized to track this order.");
        }

        var groupName = $"order-{orderId}";

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            groupName);

        // Customer ko join karte hi latest saved location bhejo.
        if (order.RiderLatitude.HasValue &&
            order.RiderLongitude.HasValue)
        {
            await Clients.Caller.SendAsync(
                "RiderLocationUpdated",
                new
                {
                    orderId = order.Id,
                    latitude = order.RiderLatitude.Value,
                    longitude = order.RiderLongitude.Value,
                    updatedAt = order.RiderLocationUpdatedAt.HasValue
                    ? DateTime.SpecifyKind(order.RiderLocationUpdatedAt.Value, DateTimeKind.Utc)
                    : (DateTime?)null
                });
        }
    }

    public async Task UpdateRiderLocation(
        int orderId,
        double latitude,
        double longitude)
    {
        var userId = Context.User?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId) ||
            Context.User?.IsInRole("Rider") != true)
        {
            throw new HubException(
                "Only riders can send GPS updates.");
        }

        if (!double.IsFinite(latitude) ||
            !double.IsFinite(longitude) ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180)
        {
            throw new HubException(
                "Invalid GPS coordinates.");
        }

        var order = await _db.Orders
            .FirstOrDefaultAsync(x => x.Id == orderId);

        if (order == null ||
            order.RiderId != userId ||
            order.Status != "Out for Delivery")
        {
            throw new HubException(
                "This order is not an active delivery assigned to you.");
        }

        // Save latest GPS location in database.
        var updatedAt = DateTime.UtcNow;

        order.RiderLatitude = latitude;
        order.RiderLongitude = longitude;
        order.RiderLocationUpdatedAt = updatedAt;

        await _db.SaveChangesAsync();

        // Broadcast the latest location to tracking subscribers.
        await Clients.Group($"order-{orderId}")
            .SendAsync("RiderLocationUpdated", new
            {
                orderId,
                latitude,
                longitude,
                updatedAt
            });
    }

    public async Task UpdateMyLocation(double latitude, double longitude)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userId) ||
            Context.User?.IsInRole("Rider") != true)
            throw new HubException("Only riders can send GPS updates.");

        if (!double.IsFinite(latitude) || !double.IsFinite(longitude) ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180)
            throw new HubException("Invalid GPS coordinates.");

        var orders = await _db.Orders
            .Where(x => x.RiderId == userId && x.Status == "Out for Delivery")
            .ToListAsync();

        if (orders.Count == 0)
            throw new HubException("No active delivery assigned to you.");

        var updatedAt = DateTime.UtcNow;

        foreach (var order in orders)
        {
            order.RiderLatitude = latitude;
            order.RiderLongitude = longitude;
            order.RiderLocationUpdatedAt = updatedAt;
        }

        await _db.SaveChangesAsync();

        foreach (var order in orders)
        {
            await Clients.Group($"order-{order.Id}")
                .SendAsync("RiderLocationUpdated", new
                {
                    orderId = order.Id,
                    latitude,
                    longitude,
                    updatedAt
                });
        }
    }
}
