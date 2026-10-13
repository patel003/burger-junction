using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

using BurgerJunction.Api.Data;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Controllers;

// =========================================
// RAZORPAY WEBHOOK
//
// Razorpay khud server-to-server ye endpoint call karta hai.
// Isse customer ka browser band ho jaye tab bhi payment "Paid" ho jata hai.
//
// Login (JWT) yahan nahi hota. Suraksha sirf X-Razorpay-Signature se hai,
// jo Razorpay Webhook Secret se banta hai.
//
// Secret config key: Razorpay:WebhookSecret
// (user-secrets / env var Razorpay__WebhookSecret)
// =========================================

[ApiController]
[AllowAnonymous]
[Route("api/payments/razorpay/webhook")]
public class RazorpayWebhookController(
    AppDbContext db,
    IConfiguration configuration,
    ILogger<RazorpayWebhookController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Handle()
    {
        var secret = configuration["Razorpay:WebhookSecret"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            logger.LogError("Razorpay webhook secret is not configured.");
            return StatusCode(500);
        }

        // Signature RAW body par banta hai, isliye body ko bina badle padhna hai
        string body;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
        {
            body = await reader.ReadToEndAsync();
        }

        var signature = Request.Headers["X-Razorpay-Signature"].ToString();

        if (string.IsNullOrWhiteSpace(signature) ||
            !SignatureMatches(body, signature, secret))
        {
            logger.LogWarning("Razorpay webhook rejected: invalid signature.");
            return BadRequest();
        }

        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            var eventName = root.GetProperty("event").GetString();

            // Sirf successful payment me kaam hai. Baaki events ko OK bol do
            // (nahi to Razorpay baar-baar retry karta rahega).
            if (eventName != "payment.captured")
            {
                return Ok();
            }

            var entity = root
                .GetProperty("payload")
                .GetProperty("payment")
                .GetProperty("entity");

            var razorpayOrderId = entity.GetProperty("order_id").GetString();
            var razorpayPaymentId = entity.GetProperty("id").GetString();
            var amountInPaise = entity.GetProperty("amount").GetInt64();

            if (string.IsNullOrWhiteSpace(razorpayOrderId) ||
                string.IsNullOrWhiteSpace(razorpayPaymentId))
            {
                return Ok();
            }

            var payment = await db.Payments
                .FirstOrDefaultAsync(x =>
                    x.RazorpayOrderId == razorpayOrderId);

            if (payment is null)
            {
                logger.LogWarning(
                    "Razorpay webhook: no payment for razorpay order {RazorpayOrderId}.",
                    razorpayOrderId);
                return Ok();
            }

            // Pehle se Paid (browser verify se) -> kuch nahi karna
            if (payment.Status == "Paid")
            {
                return Ok();
            }

            // Jo paisa asal me kata wo hamare amount se match hona chahiye
            var expectedPaise = (long)Math.Round(
                payment.Amount * 100m,
                0,
                MidpointRounding.AwayFromZero);

            if (amountInPaise != expectedPaise)
            {
                logger.LogError(
                    "Razorpay webhook amount mismatch for payment {PaymentId}: got {Got}, expected {Expected}.",
                    payment.Id, amountInPaise, expectedPaise);
                return Ok();
            }

            // Sirf Pending ko Paid karte hain. Failed/Cancelled par paisa kat gaya
            // ho to ye manual refund/review ka case hai, auto-change nahi.
            if (payment.Status != "Pending")
            {
                logger.LogError(
                    "Razorpay captured money for payment {PaymentId} with status {Status}. Manual review/refund needed.",
                    payment.Id, payment.Status);
                return Ok();
            }

            payment.RazorpayPaymentId = razorpayPaymentId;
            payment.PaymentMethod = "Razorpay";
            payment.Status = "Paid";

            await db.SaveChangesAsync();

            return Ok();
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException
                                       or InvalidOperationException)
        {
            // Signature sahi thi par payload ka shape alag hai
            logger.LogError(ex, "Razorpay webhook payload could not be read.");
            return Ok();
        }
    }

    private static bool SignatureMatches(
        string body,
        string signature,
        string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));

        var expected = Convert.ToHexString(
                hmac.ComputeHash(Encoding.UTF8.GetBytes(body)))
            .ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
    }
}