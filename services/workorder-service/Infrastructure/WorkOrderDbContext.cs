using Microsoft.EntityFrameworkCore;
using WorkOrderService.Domain;

namespace WorkOrderService.Infrastructure;

public class WorkOrderDbContext : DbContext
{
    public WorkOrderDbContext(DbContextOptions<WorkOrderDbContext> options)
        : base(options)
    {
    }

    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderLineItem> WorkOrderLineItems => Set<WorkOrderLineItem>();
    public DbSet<LaborEntry> LaborEntries => Set<LaborEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // WorkOrder
        modelBuilder.Entity<WorkOrder>(entity =>
        {
            entity.ToTable("work_orders");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .ValueGeneratedNever();

            entity.Property(e => e.CustomerId)
                .HasColumnName("customer_id")
                .IsRequired();

            entity.Property(e => e.VehicleId)
                .HasColumnName("vehicle_id")
                .IsRequired();

            entity.Property(e => e.Description)
                .HasColumnName("description")
                .HasMaxLength(2000)
                .IsRequired();

            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasConversion<string>()
                .IsRequired();

            entity.Property(e => e.AssignedMechanic)
                .HasColumnName("assigned_mechanic")
                .HasMaxLength(255);

            entity.Property(e => e.Notes)
                .HasColumnName("notes")
                .HasMaxLength(4000);

            entity.Property(e => e.EstimatedTotalCents)
                .HasColumnName("estimated_total_cents")
                .IsRequired();

            entity.Property(e => e.ActualTotalCents)
                .HasColumnName("actual_total_cents")
                .IsRequired();

            entity.Property(e => e.Currency)
                .HasColumnName("currency")
                .HasMaxLength(3)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.Property(e => e.UpdatedAt)
                .HasColumnName("updated_at")
                .IsRequired();

            entity.Property(e => e.CompletedAt)
                .HasColumnName("completed_at");

            // Indexes
            entity.HasIndex(e => e.CustomerId)
                .HasDatabaseName("ix_work_orders_customer_id");

            entity.HasIndex(e => e.Status)
                .HasDatabaseName("ix_work_orders_status");

            entity.HasIndex(e => new { e.CustomerId, e.Status })
                .HasDatabaseName("ix_work_orders_customer_id_status");

            // Relationships
            entity.HasMany(e => e.LineItems)
                .WithOne(li => li.WorkOrder)
                .HasForeignKey(li => li.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.LaborEntries)
                .WithOne(le => le.WorkOrder)
                .HasForeignKey(le => le.WorkOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // WorkOrderLineItem
        modelBuilder.Entity<WorkOrderLineItem>(entity =>
        {
            entity.ToTable("work_order_line_items");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .ValueGeneratedNever();

            entity.Property(e => e.WorkOrderId)
                .HasColumnName("work_order_id")
                .IsRequired();

            entity.Property(e => e.PartId)
                .HasColumnName("part_id")
                .IsRequired();

            entity.Property(e => e.PartName)
                .HasColumnName("part_name")
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(e => e.Quantity)
                .HasColumnName("quantity")
                .IsRequired();

            entity.Property(e => e.UnitPriceCents)
                .HasColumnName("unit_price_cents")
                .IsRequired();

            entity.Property(e => e.TotalPriceCents)
                .HasColumnName("total_price_cents")
                .IsRequired();

            entity.Property(e => e.Currency)
                .HasColumnName("currency")
                .HasMaxLength(3)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.HasIndex(e => e.WorkOrderId)
                .HasDatabaseName("ix_work_order_line_items_work_order_id");

            entity.HasIndex(e => e.PartId)
                .HasDatabaseName("ix_work_order_line_items_part_id");
        });

        // LaborEntry
        modelBuilder.Entity<LaborEntry>(entity =>
        {
            entity.ToTable("labor_entries");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasColumnName("id")
                .ValueGeneratedNever();

            entity.Property(e => e.WorkOrderId)
                .HasColumnName("work_order_id")
                .IsRequired();

            entity.Property(e => e.Description)
                .HasColumnName("description")
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(e => e.Hours)
                .HasColumnName("hours")
                .HasPrecision(10, 2)
                .IsRequired();

            entity.Property(e => e.HourlyRateCents)
                .HasColumnName("hourly_rate_cents")
                .IsRequired();

            entity.Property(e => e.TotalCents)
                .HasColumnName("total_cents")
                .IsRequired();

            entity.Property(e => e.MechanicName)
                .HasColumnName("mechanic_name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Currency)
                .HasColumnName("currency")
                .HasMaxLength(3)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .IsRequired();

            entity.HasIndex(e => e.WorkOrderId)
                .HasDatabaseName("ix_labor_entries_work_order_id");
        });
    }
}
