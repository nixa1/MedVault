namespace MedVault.Models;

public class Medicine
{
    public int Id { get; set; }
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string Ingredient { get; set; } = "";
    public string Form { get; set; } = "";
    public string Category { get; set; } = "";
    public bool PrescriptionOnly { get; set; }
    public int MinStock { get; set; }

    public List<Batch> Batches { get; set; } = [];
}
