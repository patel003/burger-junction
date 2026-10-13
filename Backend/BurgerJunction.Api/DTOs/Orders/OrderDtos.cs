using System.ComponentModel.DataAnnotations;

namespace BurgerJunction.Api.DTOs.Orders;

public record CreateOrderDto(
    [param: Required]
    [param: StringLength(100)]
    string CustomerName,

    [param: Required]
    [param: RegularExpression(
    @"^[6-9][0-9]{9}$",
    ErrorMessage = "Please enter a valid 10-digit Indian mobile number."
    )]
    string CustomerPhone,

    [param: Required]
    [param: StringLength(500)]
    string DeliveryAddress,

    [param: Required]
    [param: MinLength(1)]
    List<CreateOrderItemDto> Items,

    [param: StringLength(50)]
    string? CouponCode,

    [param: Range(-90, 90)]
    double? DeliveryLatitude = null,

    [param: Range(-180, 180)]
    double? DeliveryLongitude = null
);


public record CreateOrderItemDto(
    [param: Range(1, int.MaxValue)]
    int ProductId,

    [param: Range(1, 100)]
    int Quantity
);

public record OrderItemDto(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal Price
);

public record OrderDto(
    int Id,
    string CustomerName,
    string CustomerPhone,
    string DeliveryAddress,
    decimal TotalAmount,
    string? CouponCode,
    decimal DiscountAmount,
    string Status,
    DateTime CreatedAt,
    string? PaymentMethod,
    string? PaymentStatus,
    string? RiderName,
    string? RiderPhone,
    List<OrderItemDto> Items,
    double? DeliveryLatitude = null,
    double? DeliveryLongitude = null,
    double? RiderLatitude = null,
    double? RiderLongitude = null,
    DateTime? RiderLocationUpdatedAt = null
);
