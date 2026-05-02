package com.deepakraj.order.service;

import com.deepakraj.order.dto.CreateOrderRequest;
import com.deepakraj.order.dto.OrderResponse;
import com.deepakraj.order.dto.PaymentUpdateRequest;
import com.deepakraj.order.dto.UpdateOrderStatusRequest;

import java.util.List;

public interface OrderService {

    OrderResponse createOrder(String authorization, CreateOrderRequest request);

    List<OrderResponse> getMyOrders(String authorization);

    OrderResponse getMyOrder(String authorization, Long orderId);

    List<OrderResponse> getAllOrders();

    OrderResponse getOrderById(Long orderId);

    OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusRequest request);

    OrderResponse updatePaymentStatus(PaymentUpdateRequest request);

    OrderResponse cancelMyOrder(String authorization, Long orderId);
}
