using BurgerJunction.Api.Models;

namespace BurgerJunction.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (db.Categories.Any()) return;

        var burgers = new Category { Name = "Burgers" };
        var wraps = new Category { Name = "Wraps" };
        var sides = new Category { Name = "Sides" };
        var drinks = new Category { Name = "Drinks" };

        db.Categories.AddRange(burgers, wraps, sides, drinks);
        db.SaveChanges();

        db.Products.AddRange(
            new Product { Name = "Aloo Tikki Burger", Description = "Crispy aloo patty, mint mayo", Price = 79, CategoryId = burgers.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Burger" },
            new Product { Name = "Paneer Crunch Burger", Description = "Crumb-fried paneer, spicy sauce", Price = 129, CategoryId = burgers.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Burger" },
            new Product { Name = "Chicken Zinger", Description = "Juicy fried chicken, lettuce", Price = 149, CategoryId = burgers.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Chicken" },
            new Product { Name = "Double Cheese Burger", Description = "Two patties, two cheese slices", Price = 169, CategoryId = burgers.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Cheese" },
            new Product { Name = "Paneer Wrap", Description = "Paneer, veggies and sauce", Price = 119, CategoryId = wraps.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Wrap" },
            new Product { Name = "French Fries", Description = "Crispy salted fries", Price = 89, CategoryId = sides.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Fries" },
            new Product { Name = "Cold Drink", Description = "Chilled soft drink", Price = 59, CategoryId = drinks.Id, IsAvailable = true, ImageUrl = "https://placehold.co/100x100?text=Drink" }
        );

        db.SaveChanges();
    }
}
