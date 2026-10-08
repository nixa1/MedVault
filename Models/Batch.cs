namespace MedVault.Models;

public class Batch
{
    public int Id { get; set; }

    public int MedicineId { get; set; }
    public Medicine Medicine { get; set; } = null!;

    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public string Number { get; set; } = "";
    public DateOnly Expiry { get; set; }
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public DateTime Created { get; set; } = DateTime.UtcNow;
}
