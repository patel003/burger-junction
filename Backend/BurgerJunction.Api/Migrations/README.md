Run these commands from Backend/BurgerJunction.Api:

dotnet ef migrations add InitialCreate
dotnet ef database update

The application also calls Database.Migrate() at startup, so existing migrations are applied automatically.
