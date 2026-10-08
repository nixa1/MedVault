using Microsoft.EntityFrameworkCore;
using MedVault.Contracts;
using MedVault.Data;
using MedVault.Models;

namespace MedVault.Endpoints;

public static class MedicineEndpoints
{
    public static void MapMedicineEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/medicines", GetAll);
        api.MapPost("/medicines", Create).RequireAuthorization(p => p.RequireRole(Roles.Admin));
        api.MapPut("/medicines/{id:int}", Update).RequireAuthorization(p => p.RequireRole(Roles.Admin));
        api.MapDelete("/medicines/{id:int}", Delete).RequireAuthorization(p => p.RequireRole(Roles.Admin));
    }

    private static async Task<IResult> GetAll(string? search, string? category, bool? prescriptionOnly, AppDbContext db)
    {
        var query = db.Medicines.AsQueryable();

        if (search != null)
        {
            query = query.Where(m =>
                m.Name.Contains(search) ||
                m.Ingredient.Contains(search) ||
                m.Sku.Contains(search));
        }

        if (category != null)
            query = query.Where(m => m.Category == category);

        if (prescriptionOnly != null)
            query = query.Where(m => m.PrescriptionOnly == prescriptionOnly);

        var medicines = await query.OrderBy(m => m.Name).ToListAsync();
        return Results.Ok(medicines);
    }

    private static async Task<IResult> Create(MedicineRequest request, AppDbContext db)
    {
        if (await db.Medicines.AnyAsync(m => m.Sku == request.Sku))
            return Results.Conflict(new { error = "A medicine with this SKU already exists" });

        var medicine = new Medicine();
        ApplyRequest(medicine, request);

        db.Medicines.Add(medicine);
        await db.SaveChangesAsync();

        return Results.Created($"/api/medicines/{medicine.Id}", medicine);
    }

    private static async Task<IResult> Update(int id, MedicineRequest request, AppDbContext db)
    {
        var medicine = await db.Medicines.FindAsync(id);
        if (medicine == null)
            return Results.NotFound();

        ApplyRequest(medicine, request);
        await db.SaveChangesAsync();

        return Results.Ok(medicine);
    }

    private static async Task<IResult> Delete(int id, AppDbContext db)
    {
        var medicine = await db.Medicines.FindAsync(id);
        if (medicine == null)
            return Results.NotFound();

        db.Medicines.Remove(medicine);
        await db.SaveChangesAsync();

        return Results.NoContent();
    }

    private static void ApplyRequest(Medicine medicine, MedicineRequest request)
    {
        medicine.Sku = request.Sku;
        medicine.Name = request.Name;
        medicine.Ingredient = request.Ingredient;
        medicine.Form = request.Form;
        medicine.Category = request.Category;
        medicine.PrescriptionOnly = request.PrescriptionOnly;
        medicine.MinStock = request.MinStock;
    }
}
