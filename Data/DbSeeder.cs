using Microsoft.EntityFrameworkCore;
using MedVault.Models;
using MedVault.Services;

namespace MedVault.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Database.EnsureCreated();

        if (await db.Users.AnyAsync())
            return;

        db.Users.Add(new User
        {
            Email = "admin@medvault.local",
            Name = "Administrator",
            Role = Roles.Admin,
            Password = PasswordHasher.Hash("Admin123!")
        });

        await db.SaveChangesAsync();
    }
}
