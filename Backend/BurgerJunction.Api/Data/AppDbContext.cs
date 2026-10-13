using BurgerJunction.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BurgerJunction.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    public DbSet<Coupon> Coupons => Set<Coupon>();

    public DbSet<Service> Services => Set<Service>();

    public DbSet<Payment> Payments { get; set; }

    public DbSet<RestaurantSettings> RestaurantSettings { get; set; }

    public DbSet<Notification> Notifications { get; set; }

    public DbSet<RiderProfile> RiderProfiles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // PRODUCT
        // =========================

        modelBuilder.Entity<Product>()
            .Property(x => x.Price)
            .HasColumnType("decimal(18,2)");

        // =========================
        // ORDER
        // =========================

        modelBuilder.Entity<Order>()
            .Property(x => x.TotalAmount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Order>()
            .Property(x => x.RiderEarning)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Order>()
            .Property(o => o.DiscountAmount)
            .HasPrecision(18, 2);



        // =========================
        // ORDER ITEM
        // =========================

        modelBuilder.Entity<OrderItem>()
            .Property(x => x.Price)
            .HasColumnType("decimal(18,2)");

        // =========================
        // COUPON
        // =========================

        modelBuilder.Entity<Coupon>()
            .Property(x => x.DiscountValue)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Coupon>()
            .Property(x => x.MinimumOrderAmount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Coupon>()
            .Property(x => x.MaximumDiscountAmount)
            .HasColumnType("decimal(18,2)");

        // =========================
        // SERVICE
        // =========================

        modelBuilder.Entity<Service>()
            .Property(x => x.Price)
            .HasColumnType("decimal(18,2)");

        // =========================
        // PAYMENT
        // =========================

        modelBuilder.Entity<Payment>()
            .Property(x => x.Amount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Payment>()
            .HasOne(x => x.Order)
            .WithOne(x => x.Payment)
            .HasForeignKey<Payment>(x => x.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Payment>()
            .HasIndex(x => x.RazorpayOrderId)
            .IsUnique();

        // =========================
        // PRODUCT CATEGORY
        // =========================

        modelBuilder.Entity<Product>()
            .HasOne(x => x.Category)
            .WithMany(x => x.Products)
            .HasForeignKey(x => x.CategoryId);

        // =========================
        // ORDER ITEMS
        // =========================

        modelBuilder.Entity<OrderItem>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId);

        // =========================
        // RIDER PROFILE
        // =========================

        modelBuilder.Entity<RiderProfile>()
            .Property(x => x.EarningPerDelivery)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<RiderProfile>()
            .HasOne(x => x.User)
            .WithOne()
            .HasForeignKey<RiderProfile>(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RiderProfile>()
            .HasIndex(x => x.UserId)
            .IsUnique();

        // =========================
        // ORDER → RIDER
        // =========================

        modelBuilder.Entity<Order>()
            .HasOne(x => x.Rider)
            .WithMany()
            .HasForeignKey(x => x.RiderId)
            .OnDelete(DeleteBehavior.NoAction);

        // =========================
        // NOTIFICATIONS
        // =========================

        modelBuilder.Entity<Notification>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasOne(x => x.Order)
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}