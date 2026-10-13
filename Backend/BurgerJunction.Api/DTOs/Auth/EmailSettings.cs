namespace BurgerJunction.Api.Models;

public class EmailSettings
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";   // Gmail App Password
    public string FromEmail { get; set; } = "";
    public string FromName { get; set; } = "Burger Junction";
}