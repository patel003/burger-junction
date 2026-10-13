using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BurgerJunction.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryOtpToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DeliveryOtp",
                table: "Orders",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeliveryOtp",
                table: "Orders");
        }
    }
}
