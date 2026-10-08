using System.Text;
using Microsoft.EntityFrameworkCore;
using MedVault.Data;
using MedVault.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;

namespace MedVault.Endpoints;

public static class ReportEndpoints
{
    public static void MapReportEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/reports/summary", GetSummary);
        api.MapGet("/reports/expiring", GetExpiring);
        api.MapGet("/reports/low-stock", GetLowStock);
        api.MapGet("/reports/expiring.csv", ExportExpiringCsv);
        api.MapGet("/reports/expiring.pdf", ExportExpiringPdf);
        api.MapGet("/reports/low-stock.csv", ExportLowStockCsv);
    }

    private static IQueryable<Batch> ExpiringBatches(AppDbContext db, int days)
    {
        var limit = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(days));

        return db.Batches
            .Include(b => b.Medicine)
            .Where(b => b.Quantity > 0 && b.Expiry <= limit);
    }

    private static async Task<IResult> GetSummary(AppDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var soon = today.AddDays(30);

        var lowStock = await db.Medicines
            .CountAsync(m => m.Batches.Sum(b => b.Quantity) <= m.MinStock);

        return Results.Ok(new
        {
            medicines = await db.Medicines.CountAsync(),
            suppliers = await db.Suppliers.CountAsync(),
            batches = await db.Batches.CountAsync(b => b.Quantity > 0),
            units = await db.Batches.SumAsync(b => (int?)b.Quantity) ?? 0,
            lowStock,
            expiringSoon = await db.Batches.CountAsync(b => b.Quantity > 0 && b.Expiry >= today && b.Expiry <= soon),
            expired = await db.Batches.CountAsync(b => b.Quantity > 0 && b.Expiry < today)
        });
    }

    private static async Task<IResult> GetExpiring(AppDbContext db, int days = 30)
    {
        var result = await ExpiringBatches(db, days)
            .OrderBy(b => b.Expiry)
            .Select(b => new { b.Id, medicine = b.Medicine.Name, b.Number, b.Expiry, b.Quantity })
            .ToListAsync();

        return Results.Ok(result);
    }

    private static async Task<IResult> GetLowStock(AppDbContext db)
    {
        var result = await db.Medicines
            .Select(m => new
            {
                m.Name,
                m.Sku,
                m.MinStock,
                current = m.Batches.Sum(b => b.Quantity)
            })
            .Where(x => x.current <= x.MinStock)
            .ToListAsync();

        return Results.Ok(result);
    }

    private static async Task<IResult> ExportExpiringCsv(AppDbContext db, int days = 30)
    {
        var batches = await ExpiringBatches(db, days).ToListAsync();

        var csv = new StringBuilder("Medicine,Batch,Expiry,Quantity\n");
        foreach (var b in batches)
        {
            var name = b.Medicine.Name.Replace("\"", "\"\"");
            csv.AppendLine($"\"{name}\",{b.Number},{b.Expiry:yyyy-MM-dd},{b.Quantity}");
        }

        return Results.File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "expiring.csv");
    }

    private static async Task<IResult> ExportExpiringPdf(AppDbContext db, int days = 30)
    {
        var batches = await ExpiringBatches(db, days).OrderBy(b => b.Expiry).ToListAsync();

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(30);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("MedVault — Expiring stock").FontSize(18).SemiBold();
                    col.Item().Text($"Batches expiring within {days} days · generated {DateTime.Now:yyyy-MM-dd HH:mm}")
                        .FontColor(Colors.Grey.Darken1);
                });

                page.Content().PaddingTop(15).Table(table =>
                {
                    table.ColumnsDefinition(c =>
                    {
                        c.RelativeColumn(3);
                        c.RelativeColumn(2);
                        c.RelativeColumn(2);
                        c.RelativeColumn(1);
                    });

                    table.Header(h =>
                    {
                        foreach (var title in new[] { "Medicine", "Batch", "Expiry", "Qty" })
                            h.Cell().BorderBottom(1).PaddingVertical(4).Text(title).SemiBold();
                    });

                    foreach (var b in batches)
                    {
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).Text(b.Medicine.Name);
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).Text(b.Number);
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).Text($"{b.Expiry:yyyy-MM-dd}");
                        table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).Text(b.Quantity.ToString());
                    }
                });

                page.Footer().AlignRight().Text(t =>
                {
                    t.CurrentPageNumber();
                    t.Span(" / ");
                    t.TotalPages();
                });
            });
        }).GeneratePdf();

        return Results.File(pdf, "application/pdf", "expiring.pdf");
    }

    private static async Task<IResult> ExportLowStockCsv(AppDbContext db)
    {
        var items = await db.Medicines
            .Select(m => new { m.Name, m.Sku, m.MinStock, Current = m.Batches.Sum(b => b.Quantity) })
            .Where(x => x.Current <= x.MinStock)
            .OrderBy(x => x.Name)
            .ToListAsync();

        var csv = new StringBuilder("Medicine,SKU,Current,Minimum\n");
        foreach (var x in items)
            csv.AppendLine($"\"{x.Name.Replace("\"", "\"\"")}\",{x.Sku},{x.Current},{x.MinStock}");

        return Results.File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", "low-stock.csv");
    }
}
