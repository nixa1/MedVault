namespace MedVault.Models;

public class Purchase
{
    public int Id { get; set; }
    public string Number { get; set; } = "";

    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public int UserId { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTime Created { get; set; } = DateTime.UtcNow;

    public List<PurchaseItem> Items { get; set; } = [];
}

public class PurchaseItem
{
    public int Id { get; set; }
    public int PurchaseId { get; set; }

    public int MedicineId { get; set; }
    public Medicine Medicine { get; set; } = null!;

    public string BatchNumber { get; set; } = "";
    public DateOnly Expiry { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}
