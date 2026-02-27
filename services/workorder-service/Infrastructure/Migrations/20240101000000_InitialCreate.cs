using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkOrderService.Infrastructure.Migrations
{
    /// <inheritdoc />
    [Migration("20240101000000_InitialCreate")]
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "work_orders",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vehicle_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    assigned_mechanic = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    estimated_total_cents = table.Column<long>(type: "bigint", nullable: false),
                    actual_total_cents = table.Column<long>(type: "bigint", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_orders", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "labor_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    hours = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    hourly_rate_cents = table.Column<long>(type: "bigint", nullable: false),
                    total_cents = table.Column<long>(type: "bigint", nullable: false),
                    mechanic_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_labor_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_labor_entries_work_orders_work_order_id",
                        column: x => x.work_order_id,
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_order_line_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    work_order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    part_id = table.Column<Guid>(type: "uuid", nullable: false),
                    part_name = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_price_cents = table.Column<long>(type: "bigint", nullable: false),
                    total_price_cents = table.Column<long>(type: "bigint", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_order_line_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_work_order_line_items_work_orders_work_order_id",
                        column: x => x.work_order_id,
                        principalTable: "work_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Indexes for work_orders
            migrationBuilder.CreateIndex(
                name: "ix_work_orders_customer_id",
                table: "work_orders",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_orders_status",
                table: "work_orders",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_work_orders_customer_id_status",
                table: "work_orders",
                columns: new[] { "customer_id", "status" });

            // Indexes for labor_entries
            migrationBuilder.CreateIndex(
                name: "ix_labor_entries_work_order_id",
                table: "labor_entries",
                column: "work_order_id");

            // Indexes for work_order_line_items
            migrationBuilder.CreateIndex(
                name: "ix_work_order_line_items_work_order_id",
                table: "work_order_line_items",
                column: "work_order_id");

            migrationBuilder.CreateIndex(
                name: "ix_work_order_line_items_part_id",
                table: "work_order_line_items",
                column: "part_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "labor_entries");
            migrationBuilder.DropTable(name: "work_order_line_items");
            migrationBuilder.DropTable(name: "work_orders");
        }
    }
}
