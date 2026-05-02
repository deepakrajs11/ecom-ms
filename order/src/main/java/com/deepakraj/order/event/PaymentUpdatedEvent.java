package com.deepakraj.order.event;

import com.deepakraj.order.model.PaymentStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentUpdatedEvent {
    private String orderNumber;
    private PaymentStatus paymentStatus;
    private String paymentReference;
}
