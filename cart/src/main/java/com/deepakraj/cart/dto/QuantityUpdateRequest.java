package com.deepakraj.cart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuantityUpdateRequest {

    @NotNull
    @Min(1)
    private Integer quantity;
}
