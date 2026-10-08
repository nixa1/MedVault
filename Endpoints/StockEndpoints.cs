using Microsoft.EntityFrameworkCore;
using MedVault.Contracts;
using MedVault.Data;
using MedVault.Models;
using MedVault.Services;

namespace MedVault.Endpoints;

public static class StockEndpoints
{
    public static void MapStockEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/stock/issue", (StockRequest request, HttpContext context, AppDbContext db) =>
            TakeFromStock(request, "Issue", context, db));

        api.MapPost("/stock/write-off", (StockRequest request, HttpContext context, AppDbContext db) =>
            TakeFromStock(request, "WriteOff", context, db));

        api.MapGet("/stock/movements", GetMovements);
    }

    private static async Task<IResult> GetMovements(int? batchId, AppDbContext db)
    {
        var query = db.Movements
            .Include(m => m.Batch).ThenInclude(b => b.Medicine)
            .Include(m => m.User)
            .AsQueryable();

        if (batchId != null)
            query = query.Where(m => m.BatchId == batchId);

        return Results.Ok(await query.OrderByDescending(m => m.Created).ToListAsync());
    }

    private static async Task<IResult> TakeFromStock(StockRequest request, string type, HttpContext context, AppDbContext db)
    {
        var batch = await db.Batches.FindAsync(request.BatchId);
        if (batch == null)
            return Results.NotFound();

        if (request.Quantity <= 0 || batch.Quantity < request.Quantity)
            return Results.BadRequest("Insufficient stock");

        batch.Quantity -= request.Quantity;

        db.Movements.Add(new Movement
        {
            BatchId = batch.Id,
            Type = type,
            Quantity = request.Quantity,
            Note = request.Note,
            UserId = context.GetUserId()
        });

        await db.SaveChangesAsync();
        return Results.Ok(batch);
    }
}
