package com.deepakraj.order.controller;

import com.deepakraj.order.dto.CreateOrderRequest;
import com.deepakraj.order.dto.OrderResponse;
import com.deepakraj.order.dto.PaymentUpdateRequest;
import com.deepakraj.order.dto.UpdateOrderStatusRequest;
import com.deepakraj.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody CreateOrderRequest request
    ) {
        return ResponseEntity.ok(orderService.createOrder(authorization, request));
    }

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getMyOrders(@RequestHeader("Authorization") String authorization) {
        return ResponseEntity.ok(orderService.getMyOrders(authorization));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getMyOrder(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long orderId
    ) {
        return ResponseEntity.ok(orderService.getMyOrder(authorization, orderId));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelMyOrder(
            @RequestHeader("Authorization") String authorization,
            @PathVariable Long orderId
    ) {
        return ResponseEntity.ok(orderService.cancelMyOrder(authorization, orderId));
    }

    @GetMapping("/admin")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/admin/{orderId}")
    public ResponseEntity<OrderResponse> getOrderById(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getOrderById(orderId));
    }

    @PutMapping("/admin/{orderId}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request
    ) {
        return ResponseEntity.ok(orderService.updateOrderStatus(orderId, request));
    }

    @PutMapping("/admin/payment-status")
    public ResponseEntity<OrderResponse> updatePaymentStatus(@Valid @RequestBody PaymentUpdateRequest request) {
        return ResponseEntity.ok(orderService.updatePaymentStatus(request));
    }
}
