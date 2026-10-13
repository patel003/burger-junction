using BurgerJunction.Api.DTOs.Payments;
using BurgerJunction.Api.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BurgerJunction.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController( IPaymentService paymentService, IRazorpayService razorpayService) : ControllerBase 
{
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreatePaymentDto dto)
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message = "User identity not found."
            });
        }

        var payment = await paymentService.CreateAsync(
            dto,
            userId
        );

        if (payment is null)
        {
            return NotFound(new
            {
                message = "Order not found."
            });
        }

        return Ok(payment);
    }

    [HttpGet("order/{orderId:int}")]
    public async Task<IActionResult> GetByOrderId(
        int orderId)
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new
            {
                message = "User identity not found."
            });
        }

        var payment = await paymentService.GetByOrderIdAsync(
            orderId,
            userId
        );

        if (payment is null)
        {
            return NotFound(new
            {
                message = "Payment not found."
            });
        }

        return Ok(payment);
    }



    [Authorize(Roles = "Admin")]
    [HttpPatch("{paymentId:int}/status")]
    public async Task<IActionResult> UpdateStatus( int paymentId, [FromBody] string status)
   {
        try
        {
            var updated = await paymentService.UpdateStatusAsync(
                paymentId,
                status
            );

            if (!updated)
            {
                return NotFound(new
                {
                    message = "Payment not found."
                });
            }

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }  
 

  


    // =========================================
// VERIFY RAZORPAY PAYMENT
// =========================================

     [HttpPost("razorpay/verify")]
     public async Task<IActionResult> VerifyRazorpayPayment([FromBody] VerifyRazorpayPaymentDto dto)
    {
          var userId = User.FindFirstValue(
              ClaimTypes.NameIdentifier);
      
          if (string.IsNullOrEmpty(userId))
          {
              return Unauthorized(new
              {
                  message = "User identity not found."
              });
          }
      
          try
          {
              var verified =
                  await paymentService.VerifyRazorpayPaymentAsync(
                      dto,
                      userId);
      
              if (!verified)
              {
                  return BadRequest(new
                  {
                      message = "Payment verification failed."
                  });
              }
      
              var payment =
                  await paymentService.GetByOrderIdAsync(
                      dto.OrderId,
                      userId);
      
              return Ok(new
              {
                  message = "Payment verified successfully.",
                  payment
              });
          }
          catch (InvalidOperationException ex)
          {
              return BadRequest(new
              {
                  message = ex.Message
              });
          }
    } 



    [HttpPost("razorpay/order")]
    public async Task<IActionResult> CreateRazorpayOrder([FromBody] int orderId)
   {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new
            {
                message = "User identity not found."
            });
    
        try
        {
            var result = await razorpayService.CreateOrderAsync(
                orderId,
                userId);
    
            return Ok(new
            {
                orderId,
                razorpayOrderId = result.RazorpayOrderId,
                amount = result.Amount,
                currency = "INR"
            });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }
}