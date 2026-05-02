package com.deepakraj.cart.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ProductDto {
    private Long id;
    private String name;
    private String sku;
    private BigDecimal price;
    private Integer quantity;
    private String category;
    private String imageUrl;
    private Boolean active;
}
