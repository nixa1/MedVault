namespace MedVault.Contracts;

public record RegisterRequest(string Email, string Password, string Name, string? Role);

public record LoginRequest(string Email, string Password);

public record MedicineRequest(
    string Sku,
    string Name,
    string Ingredient,
    string Form,
    string Category,
    bool PrescriptionOnly,
    int MinStock);

public record SupplierRequest(
    string Name,
    string TaxId,
    string Contact,
    string Phone,
    string Email,
    string Address);

public record BatchRequest(
    int MedicineId,
    int SupplierId,
    string Number,
    DateOnly Expiry,
    int Quantity,
    decimal Price);

public record StockRequest(int BatchId, int Quantity, string? Note);

public record PurchaseOrderRequest(int SupplierId, List<PurchaseOrderItemRequest> Items);

public record PurchaseOrderItemRequest(
    int MedicineId,
    string BatchNumber,
    DateOnly Expiry,
    int Quantity,
    decimal Price);
