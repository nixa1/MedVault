using Microsoft.EntityFrameworkCore;
using MedVault.Contracts;
using MedVault.Data;
using MedVault.Models;
using MedVault.Services;

namespace MedVault.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
    }

    private static async Task<IResult> Register(RegisterRequest request, AppDbContext db)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.BadRequest(new { error = "Email, password and name are required" });
        }

        if (await db.Users.AnyAsync(u => u.Email == email))
            return Results.Conflict(new { error = "User with this email already exists" });

        var user = new User
        {
            Email = email,
            Name = request.Name.Trim(),
            Role = Roles.WarehouseEmployee,
            Password = PasswordHasher.Hash(request.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Results.Ok(new { user.Id, user.Email, user.Role });
    }

    private static async Task<IResult> Login(LoginRequest request, AppDbContext db, TokenService tokens)
    {
        var email = request.Email.Trim().ToLower();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (user == null || !PasswordHasher.Verify(request.Password, user.Password))
            return Results.Unauthorized();

        return Results.Ok(new
        {
            token = tokens.CreateToken(user),
            user = new { user.Id, user.Email, user.Name, user.Role }
        });
    }
}
