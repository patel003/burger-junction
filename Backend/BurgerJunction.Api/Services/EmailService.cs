using System.Net;
using System.Net.Mail;
using BurgerJunction.Api.Interfaces;
using BurgerJunction.Api.Models;
using Microsoft.Extensions.Options;

namespace BurgerJunction.Api.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;

    public EmailService(IOptions<EmailSettings> settings)
    {
        _settings = settings.Value;
    }

    public async Task SendPasswordResetAsync(string toEmail, string resetLink)
    {
        var safeLink = WebUtility.HtmlEncode(resetLink);

        var body = $@"
<div style=""font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;"">
  <h2 style=""color:#ed1b45;margin:0 0 12px;"">Burger Junction 🍔</h2>
  <p>Hi,</p>
  <p>We received a request to reset your password. Click the button below to choose a new one.
     This link is valid for <strong>1 hour</strong>.</p>
  <p style=""margin:24px 0;"">
    <a href=""{safeLink}""
       style=""background:#ed1b45;color:#ffffff;padding:12px 22px;border-radius:8px;
              text-decoration:none;font-weight:bold;display:inline-block;"">
      Reset password
    </a>
  </p>
  <p style=""color:#666;font-size:13px;"">If you didn't request this, you can safely ignore this email.</p>
</div>";

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail, _settings.FromName),
            Subject = "Reset your Burger Junction password",
            Body = body,
            IsBodyHtml = true
        };

        message.To.Add(toEmail);

        using var client = new SmtpClient(_settings.Host, _settings.Port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_settings.Username, _settings.Password)
        };

        await client.SendMailAsync(message);
    }
}