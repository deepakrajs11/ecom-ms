package com.deepakraj.order.dto;

import com.deepakraj.order.model.PaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentUpdateRequest {

    @NotBlank
    private String orderNumber;

    @NotNull
    private PaymentStatus paymentStatus;

    private String paymentReference;
}
