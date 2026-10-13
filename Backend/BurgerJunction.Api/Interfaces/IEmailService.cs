
 namespace BurgerJunction.Api.Interfaces;
public interface IEmailService
{
    Task SendPasswordResetAsync(string toEmail, string resetLink);
}