using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BurgerJunction.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRiderLiveLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "RiderLatitude",
                table: "Orders",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RiderLocationUpdatedAt",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "RiderLongitude",
                table: "Orders",
                type: "float",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RiderLatitude",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RiderLocationUpdatedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RiderLongitude",
                table: "Orders");
        }
    }
}
