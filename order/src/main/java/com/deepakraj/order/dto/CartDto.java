package com.deepakraj.order.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class CartDto {
    private Long userId;
    private String userEmail;
    private List<CartItemDto> items;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
}
