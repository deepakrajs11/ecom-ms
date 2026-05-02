package com.deepakraj.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateOrderRequest {

    @NotBlank
    @Size(max = 1000)
    private String shippingAddress;

    @Size(max = 30)
    private String contactPhone;
}
