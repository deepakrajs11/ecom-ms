package com.deepakraj.payment.service;

import com.deepakraj.payment.dto.PaymentResponse;
import com.deepakraj.payment.event.OrderCreatedEvent;
import com.deepakraj.payment.event.RefundRequestedEvent;

import java.util.List;

public interface PaymentService {

    void handleOrderCreated(OrderCreatedEvent event);

    void handleRefundRequested(RefundRequestedEvent event);

    PaymentResponse processOrderPayment(String orderNumber);

    PaymentResponse refundOrderPayment(String orderNumber);

    List<PaymentResponse> getMyPayments();

    PaymentResponse getMyPaymentByOrderNumber(String orderNumber);

    List<PaymentResponse> getAllPayments();

    PaymentResponse getPaymentByOrderNumber(String orderNumber);
}
