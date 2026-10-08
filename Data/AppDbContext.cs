using Microsoft.EntityFrameworkCore;
using MedVault.Models;

namespace MedVault.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<Movement> Movements => Set<Movement>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Medicine>().HasIndex(m => m.Sku).IsUnique();
        modelBuilder.Entity<Purchase>().HasIndex(p => p.Number).IsUnique();
    }
}
