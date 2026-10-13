# Burger Junction — Angular + ASP.NET Core .NET 10

Full-stack food ordering starter:
- Frontend: Angular
- Backend: ASP.NET Core Web API (.NET 10)
- Database: SQL Server + Entity Framework Core
- Data comes from the backend; no hard-coded product list in Angular.
- Customer + Admin-ready structure

## Run Backend

1. Open `Backend/BurgerJunction.Api` in Visual Studio or terminal.
2. Update the SQL Server connection string in `appsettings.json`.
3. Run:
   dotnet restore
   dotnet ef database update
   dotnet run

If EF CLI is not installed:
   dotnet tool install --global dotnet-ef

API:
- GET /api/categories
- GET /api/products
- GET /api/products/category/{categoryId}
- POST /api/products
- PUT /api/products/{id}
- DELETE /api/products/{id}
- GET /api/orders
- POST /api/orders

## Run Angular

Open `Frontend/burger-junction`:
   npm install
   npm start

Angular runs on http://localhost:4200.

Change API URL in:
`Frontend/burger-junction/src/app/core/services/api.service.ts`

## Notes

This is a clean starter you can extend with:
- JWT login/register
- Cart persistence
- Product customization
- Admin dashboard
- Payment gateway
- Order status tracking
- Image upload


## Professional structure

The application is organized by feature on the Angular side and by
Controller / DTO / Interface / Service / Data / Model responsibilities
on the API side. The current working menu flow has been moved into
`src/app/features/menu/components/menu.component.*`.

Future modules are reserved for Auth, Cart, Checkout, Orders, Payments,
Coupons and Admin. They will be implemented one feature at a time so
the current working flow remains stable.
