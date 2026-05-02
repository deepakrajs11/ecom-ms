package com.deepakraj.order.dto;

import com.deepakraj.order.model.OrderStatus;
import com.deepakraj.order.model.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class OrderResponse {
    private Long id;
    private String orderNumber;
    private Long userId;
    private String userEmail;
    private OrderStatus status;
    private PaymentStatus paymentStatus;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
    private String shippingAddress;
    private String contactPhone;
    private String paymentReference;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OrderItemResponse> items;
}
