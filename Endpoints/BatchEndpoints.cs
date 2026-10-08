using Microsoft.EntityFrameworkCore;
using MedVault.Contracts;
using MedVault.Data;
using MedVault.Models;
using MedVault.Services;

namespace MedVault.Endpoints;

public static class BatchEndpoints
{
    public static void MapBatchEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/batches", GetAll);
        api.MapPost("/batches", Create).RequireAuthorization(p => p.RequireRole(Roles.Admin));
    }

    private static async Task<IResult> GetAll(DateOnly? expiresBefore, bool? expired, int? medicineId, AppDbContext db)
    {
        var query = db.Batches.Include(b => b.Medicine).AsQueryable();

        if (medicineId != null)
            query = query.Where(b => b.MedicineId == medicineId);

        if (expiresBefore.HasValue)
            query = query.Where(b => b.Expiry <= expiresBefore);

        if (expired == true)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            query = query.Where(b => b.Expiry < today);
        }

        return Results.Ok(await query.OrderBy(b => b.Expiry).ToListAsync());
    }

    private static async Task<IResult> Create(BatchRequest request, HttpContext context, AppDbContext db)
    {
        var medicineExists = await db.Medicines.AnyAsync(m => m.Id == request.MedicineId);
        var supplierExists = await db.Suppliers.AnyAsync(s => s.Id == request.SupplierId);

        if (!medicineExists || !supplierExists)
            return Results.BadRequest("Medicine or supplier not found");

        var batch = new Batch
        {
            MedicineId = request.MedicineId,
            SupplierId = request.SupplierId,
            Number = request.Number,
            Expiry = request.Expiry,
            Quantity = request.Quantity,
            Price = request.Price
        };

        db.Batches.Add(batch);

        db.Movements.Add(new Movement
        {
            Batch = batch,
            Type = "Receipt",
            Quantity = request.Quantity,
            Note = "Initial receipt",
            UserId = context.GetUserId()
        });

        await db.SaveChangesAsync();

        return Results.Created($"/api/batches/{batch.Id}", batch);
    }
}
