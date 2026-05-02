package com.deepakraj.payment.event;

import com.deepakraj.payment.model.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PaymentUpdatedEvent {
    private String orderNumber;
    private PaymentStatus paymentStatus;
    private String paymentReference;
}
