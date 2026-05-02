package com.deepakraj.payment.controller;

import com.deepakraj.payment.dto.PaymentResponse;
import com.deepakraj.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getMyPayments() {
        return ResponseEntity.ok(paymentService.getMyPayments());
    }

    @GetMapping("/orders/{orderNumber}")
    public ResponseEntity<PaymentResponse> getMyPaymentByOrderNumber(@PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.getMyPaymentByOrderNumber(orderNumber));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @GetMapping("/admin/orders/{orderNumber}")
    public ResponseEntity<PaymentResponse> getPaymentByOrderNumber(@PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.getPaymentByOrderNumber(orderNumber));
    }

    @PostMapping("/admin/orders/{orderNumber}/process")
    public ResponseEntity<PaymentResponse> processOrderPayment(@PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.processOrderPayment(orderNumber));
    }

    @PostMapping("/admin/orders/{orderNumber}/refund")
    public ResponseEntity<PaymentResponse> refundOrderPayment(@PathVariable String orderNumber) {
        return ResponseEntity.ok(paymentService.refundOrderPayment(orderNumber));
    }
}
