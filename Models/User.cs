namespace MedVault.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string Role { get; set; } = Roles.WarehouseEmployee;

    public string Password { get; set; } = "";
}

public static class Roles
{
    public const string Admin = "Admin";
    public const string Pharmacist = "Pharmacist";
    public const string WarehouseEmployee = "WarehouseEmployee";
}
