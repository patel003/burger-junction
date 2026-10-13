using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BurgerJunction.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRiderEarnings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EarningPerDelivery",
                table: "RiderProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RiderEarning",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EarningPerDelivery",
                table: "RiderProfiles");

            migrationBuilder.DropColumn(
                name: "RiderEarning",
                table: "Orders");
        }
    }
}
