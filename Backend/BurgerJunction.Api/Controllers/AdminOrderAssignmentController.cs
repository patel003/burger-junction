using BurgerJunction.Api.Data;
using BurgerJunction.Api.Hubs;
using BurgerJunction.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
public class AdminOrderAssignmentController(
    AppDbContext db,
    NotificationService notificationService,
    IHubContext<RiderHub> riderHub
) : ControllerBase
{
    [HttpPut("{id:int}/assign-rider")]
    public async Task<IActionResult> AssignRider(
        int id,
        AssignRiderRequest request)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order == null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        if (order.Status == "Delivered")
        {
            return BadRequest(new
            {
                message = "Delivered order cannot be assigned."
            });
        }

        if (order.Status == "Cancelled")
        {
            return BadRequest(new
            {
                message = "Cancelled order cannot be assigned."
            });
        }

        var rider = await db.RiderProfiles
            .Include(x => x.User)
            .FirstOrDefaultAsync(
                x => x.Id == request.RiderId);

        if (rider == null)
        {
            return NotFound(new
            {
                message = "Rider not found."
            });
        }

        if (!rider.IsActive)
        {
            return BadRequest(new
            {
                message = "This rider is inactive."
            });
        }

        order.RiderId = rider.UserId;
        order.AssignedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // Save notification in database
        await notificationService.CreateAsync(
            rider.UserId,
            "New Delivery Assigned",
            $"Order #{order.Id} has been assigned to you.",
            "RiderOrder",
            order.Id
        );

        // Send real-time SignalR event to this rider
        await riderHub.Clients
            .Group($"user-{rider.UserId}")
            .SendAsync(
                "DeliveryAssigned",
                new
                {
                    orderId = order.Id,
                    message = $"Order #{order.Id} has been assigned to you.",
                    customerName = order.CustomerName,
                    deliveryAddress = order.DeliveryAddress,
                    status = order.Status
                }
            );

        return Ok(new
        {
            message = "Rider assigned successfully.",
            orderId = order.Id,
            riderId = rider.Id,
            riderName = rider.User.FullName,
            riderPhone = rider.User.PhoneNumber,
            assignedAt = order.AssignedAt
        });
    }
}

public record AssignRiderRequest(
    int RiderId
);