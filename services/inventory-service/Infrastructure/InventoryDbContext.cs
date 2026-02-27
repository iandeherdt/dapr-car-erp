using InventoryService.Domain;
using Microsoft.EntityFrameworkCore;

namespace InventoryService.Infrastructure;

public class InventoryDbContext : DbContext
{
    public InventoryDbContext(DbContextOptions<InventoryDbContext> options) : base(options) { }

    public DbSet<Part> Parts => Set<Part>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<ReservationItem> ReservationItems => Set<ReservationItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Part ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<Part>(entity =>
        {
            entity.ToTable("parts");

            entity.HasKey(p => p.Id);

            entity.Property(p => p.Id)
                  .HasColumnName("id")
                  .ValueGeneratedNever();

            entity.Property(p => p.Sku)
                  .HasColumnName("sku")
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(p => p.Name)
                  .HasColumnName("name")
                  .IsRequired()
                  .HasMaxLength(255);

            entity.Property(p => p.Description)
                  .HasColumnName("description")
                  .HasMaxLength(2000);

            entity.Property(p => p.Category)
                  .HasColumnName("category")
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(p => p.Manufacturer)
                  .HasColumnName("manufacturer")
                  .HasMaxLength(200);

            entity.Property(p => p.UnitPriceCents)
                  .HasColumnName("unit_price_cents")
                  .IsRequired();

            entity.Property(p => p.UnitPriceCurrency)
                  .HasColumnName("unit_price_currency")
                  .HasMaxLength(3)
                  .HasDefaultValue("EUR");

            entity.Property(p => p.CostPriceCents)
                  .HasColumnName("cost_price_cents")
                  .IsRequired();

            entity.Property(p => p.CostPriceCurrency)
                  .HasColumnName("cost_price_currency")
                  .HasMaxLength(3)
                  .HasDefaultValue("EUR");

            entity.Property(p => p.QuantityInStock)
                  .HasColumnName("quantity_in_stock")
                  .IsRequired();

            entity.Property(p => p.QuantityReserved)
                  .HasColumnName("quantity_reserved")
                  .IsRequired()
                  .HasDefaultValue(0);

            entity.Property(p => p.ReorderLevel)
                  .HasColumnName("reorder_level")
                  .IsRequired()
                  .HasDefaultValue(5);

            entity.Property(p => p.Location)
                  .HasColumnName("location")
                  .HasMaxLength(100);

            // PostgreSQL native text[] array column
            entity.Property(p => p.CompatibleMakes)
                  .HasColumnName("compatible_makes")
                  .HasColumnType("text[]");

            entity.Property(p => p.CreatedAt)
                  .HasColumnName("created_at")
                  .IsRequired();

            entity.Property(p => p.UpdatedAt)
                  .HasColumnName("updated_at")
                  .IsRequired();

            // Ignore computed properties - they are not persisted
            entity.Ignore(p => p.AvailableQuantity);
            entity.Ignore(p => p.IsLowStock);

            // Unique index on SKU for fast lookups and uniqueness enforcement
            entity.HasIndex(p => p.Sku)
                  .IsUnique()
                  .HasDatabaseName("ix_parts_sku");

            // Index on Category for filtered list queries
            entity.HasIndex(p => p.Category)
                  .HasDatabaseName("ix_parts_category");

            // Index on QuantityInStock for low-stock scans
            entity.HasIndex(p => p.QuantityInStock)
                  .HasDatabaseName("ix_parts_quantity_in_stock");
        });

        // ── Reservation ───────────────────────────────────────────────────────
        modelBuilder.Entity<Reservation>(entity =>
        {
            entity.ToTable("reservations");

            entity.HasKey(r => r.Id);

            entity.Property(r => r.Id)
                  .HasColumnName("id")
                  .ValueGeneratedNever();

            entity.Property(r => r.WorkOrderId)
                  .HasColumnName("work_order_id")
                  .IsRequired();

            entity.Property(r => r.Status)
                  .HasColumnName("status")
                  .IsRequired()
                  .HasMaxLength(20)
                  .HasDefaultValue("active");

            entity.Property(r => r.CreatedAt)
                  .HasColumnName("created_at")
                  .IsRequired();

            entity.Property(r => r.ReleasedAt)
                  .HasColumnName("released_at");

            entity.HasIndex(r => r.WorkOrderId)
                  .HasDatabaseName("ix_reservations_work_order_id");

            entity.HasIndex(r => r.Status)
                  .HasDatabaseName("ix_reservations_status");

            entity.HasMany(r => r.Items)
                  .WithOne(i => i.Reservation)
                  .HasForeignKey(i => i.ReservationId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ReservationItem ───────────────────────────────────────────────────
        modelBuilder.Entity<ReservationItem>(entity =>
        {
            entity.ToTable("reservation_items");

            entity.HasKey(i => i.Id);

            entity.Property(i => i.Id)
                  .HasColumnName("id")
                  .ValueGeneratedNever();

            entity.Property(i => i.ReservationId)
                  .HasColumnName("reservation_id")
                  .IsRequired();

            entity.Property(i => i.PartId)
                  .HasColumnName("part_id")
                  .IsRequired();

            entity.Property(i => i.Quantity)
                  .HasColumnName("quantity")
                  .IsRequired();

            entity.Property(i => i.UnitPriceCents)
                  .HasColumnName("unit_price_cents")
                  .IsRequired();

            entity.HasOne(i => i.Part)
                  .WithMany(p => p.ReservationItems)
                  .HasForeignKey(i => i.PartId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(i => i.ReservationId)
                  .HasDatabaseName("ix_reservation_items_reservation_id");

            entity.HasIndex(i => i.PartId)
                  .HasDatabaseName("ix_reservation_items_part_id");
        });
    }
}
