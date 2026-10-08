# MedVault

A working ASP.NET Core Web API for managing a pharmacy warehouse.

## Quick start

```bash
dotnet run --urls http://localhost:5000
```

After launch:

- API: `http://localhost:5000/`
- health check: `http://localhost:5000/health`
- interactive documentation and API calls: `http://localhost:5000/swagger`

The project includes a working warehouse web dashboard: open the application root after launch. Swagger is kept separate for developers and is available at `/swagger`.

Demo credentials: `admin@medvault.local` / `Admin123!`. First call `POST /api/auth/login`, copy the token, and click `Authorize` in Swagger.

For the container: `docker compose up --build`, then open `http://localhost:8080/swagger`.

## Features

- JWT authentication and the roles `Admin`, `Pharmacist`, `WarehouseEmployee`;
- medicines, search, categories, prescription status, and minimum stock levels;
- suppliers, batches, expiration dates, and stock balances;
- receiving goods via batches and purchase orders;
- dispensing and write-offs with available-stock checks;
- warehouse movement log;
- reports on low stock and expiring batches;
- report export to CSV and PDF;
- SQLite by default; PostgreSQL can be connected by swapping the provider/connection string;
- Swagger/OpenAPI and Docker.

Main routes: `/api/auth/*`, `/api/medicines`, `/api/suppliers`, `/api/batches`, `/api/stock/*`, `/api/purchase-orders`, `/api/reports/*`.
