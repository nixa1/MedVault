using System.Security.Claims;

namespace MedVault.Services;

public static class UserExtensions
{
    public static int GetUserId(this HttpContext context)
    {
        var id = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.Parse(id!);
    }
}
