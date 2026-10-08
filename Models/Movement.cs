namespace MedVault.Models;

public class Movement
{
    public int Id { get; set; }

    public int BatchId { get; set; }
    public Batch Batch { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string Type { get; set; } = "";
    public int Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime Created { get; set; } = DateTime.UtcNow;
}
