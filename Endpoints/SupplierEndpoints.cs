using Microsoft.EntityFrameworkCore;
using MedVault.Contracts;
using MedVault.Data;
using MedVault.Models;

namespace MedVault.Endpoints;

public static class SupplierEndpoints
{
    public static void MapSupplierEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/suppliers", async (AppDbContext db) =>
            Results.Ok(await db.Suppliers.OrderBy(s => s.Name).ToListAsync()));

        api.MapPost("/suppliers", Create).RequireAuthorization(p => p.RequireRole(Roles.Admin));
    }

    private static async Task<IResult> Create(SupplierRequest request, AppDbContext db)
    {
        var supplier = new Supplier
        {
            Name = request.Name,
            TaxId = request.TaxId,
            Contact = request.Contact,
            Phone = request.Phone,
            Email = request.Email,
            Address = request.Address
        };

        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();

        return Results.Created($"/api/suppliers/{supplier.Id}", supplier);
    }
}
