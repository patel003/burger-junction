using BurgerJunction.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BurgerJunction.Api.Services;

public class JwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(ApplicationUser user, string role)
    {
        var key = _configuration["Jwt:Key"]
                  ?? throw new InvalidOperationException(
                      "JWT Key is missing from configuration."
                  );

        var issuer = _configuration["Jwt:Issuer"]
                     ?? throw new InvalidOperationException(
                         "JWT Issuer is missing from configuration."
                     );

        var audience = _configuration["Jwt:Audience"]
                       ?? throw new InvalidOperationException(
                           "JWT Audience is missing from configuration."
                       );

       var expiryMinutes = _configuration.GetValue<int>(
                           "Jwt:ExpiryMinutes"
                    );         

       if (expiryMinutes <= 0)
       {
            throw new InvalidOperationException( "JWT expiry configuration is invalid." );
       }

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),

            new(
                ClaimTypes.NameIdentifier,
                user.Id
            ),

            new(
                ClaimTypes.Name,
                user.FullName
            ),

            new(
                ClaimTypes.Email,
                user.Email ?? string.Empty
            ),

            new(
                ClaimTypes.Role,
                role
            )
        };

        var securityKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(key)
        );

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}