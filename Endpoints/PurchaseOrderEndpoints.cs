using Microsoft.EntityFrameworkCore;
using MedVault.Contracts;
using MedVault.Data;
using MedVault.Models;
using MedVault.Services;

namespace MedVault.Endpoints;

public static class PurchaseOrderEndpoints
{
    public static void MapPurchaseOrderEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/purchase-orders", Create);
        api.MapGet("/purchase-orders", GetAll);
    }

    private static async Task<IResult> GetAll(AppDbContext db)
    {
        var orders = await db.Purchases
            .Include(p => p.Supplier)
            .Include(p => p.Items).ThenInclude(i => i.Medicine)
            .OrderByDescending(p => p.Created)
            .ToListAsync();

        return Results.Ok(orders);
    }

    private static async Task<IResult> Create(PurchaseOrderRequest request, HttpContext context, AppDbContext db)
    {
        var userId = context.GetUserId();

        var order = new Purchase
        {
            Number = "PO-" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
            SupplierId = request.SupplierId,
            Status = "Received",
            UserId = userId,
            Items = request.Items.Select(i => new PurchaseItem
            {
                MedicineId = i.MedicineId,
                BatchNumber = i.BatchNumber,
                Expiry = i.Expiry,
                Quantity = i.Quantity,
                Price = i.Price
            }).ToList()
        };

        db.Purchases.Add(order);
        await db.SaveChangesAsync();

        foreach (var item in order.Items)
        {
            var batch = new Batch
            {
                MedicineId = item.MedicineId,
                SupplierId = order.SupplierId,
                Number = item.BatchNumber,
                Expiry = item.Expiry,
                Quantity = item.Quantity,
                Price = item.Price
            };

            db.Batches.Add(batch);
            db.Movements.Add(new Movement
            {
                Batch = batch,
                Type = "Receipt",
                Quantity = item.Quantity,
                Note = order.Number,
                UserId = userId
            });
        }

        await db.SaveChangesAsync();

        return Results.Created($"/api/purchase-orders/{order.Id}", order);
    }
}
