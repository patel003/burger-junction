using BurgerJunction.Api.Data;
using BurgerJunction.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Services;

public class NotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task CreateAsync(
        string userId,
        string title,
        string message,
        string type = "Order",
        int? orderId = null)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            OrderId = orderId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);

        await _context.SaveChangesAsync();
    }

    public async Task<List<Notification>> GetMyNotificationsAsync(
        string userId)
    {
        return await _context.Notifications
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> MarkAsReadAsync(
        int notificationId,
        string userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(x =>
                x.Id == notificationId &&
                x.UserId == userId);

        if (notification == null)
        {
            return false;
        }

        notification.IsRead = true;

        await _context.SaveChangesAsync();

        return true;
    }
}