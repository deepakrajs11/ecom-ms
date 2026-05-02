package com.deepakraj.cart.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class CartResponse {
    private Long userId;
    private String userEmail;
    private List<CartItemResponse> items;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
}
