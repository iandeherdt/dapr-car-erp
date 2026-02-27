namespace WorkOrderService.Domain;

public enum WorkOrderStatus
{
    Unspecified = 0,
    Draft = 1,
    Pending = 2,
    InProgress = 3,
    AwaitingParts = 4,
    Completed = 5,
    Cancelled = 6,
    Invoiced = 7,
}
