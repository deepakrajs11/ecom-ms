package com.deepakraj.order.service.impl;

import com.deepakraj.order.client.CartClient;
import com.deepakraj.order.client.ProductClient;
import com.deepakraj.order.client.UserClient;
import com.deepakraj.order.dto.*;
import com.deepakraj.order.event.OrderCreatedEvent;
import com.deepakraj.order.event.RefundRequestedEvent;
import com.deepakraj.order.model.CustomerOrder;
import com.deepakraj.order.model.OrderItem;
import com.deepakraj.order.model.OrderStatus;
import com.deepakraj.order.model.PaymentStatus;
import com.deepakraj.order.repository.OrderRepo;
import com.deepakraj.order.service.OrderEventPublisher;
import com.deepakraj.order.service.OrderService;
import feign.FeignException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepo orderRepo;
    private final UserClient userClient;
    private final CartClient cartClient;
    private final ProductClient productClient;
    private final OrderEventPublisher orderEventPublisher;

    @Override
    @Transactional
    public OrderResponse createOrder(String authorization, CreateOrderRequest request) {
        UserDto user = getCurrentUser(authorization);
        CartDto cart = getCart(authorization);

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty");
        }

        if (!user.getId().equals(cart.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cart does not belong to current user");
        }

        CustomerOrder order = CustomerOrder.builder()
                .orderNumber(generateOrderNumber())
                .userId(user.getId())
                .userEmail(user.getEmail())
                .status(OrderStatus.PENDING_PAYMENT)
                .paymentStatus(PaymentStatus.PENDING)
                .totalQuantity(0)
                .totalAmount(BigDecimal.ZERO)
                .shippingAddress(request.getShippingAddress().trim())
                .contactPhone(request.getContactPhone())
                .build();

        for (CartItemDto cartItem : cart.getItems()) {
            ProductDto product = getProduct(cartItem.getProductId());
            validateProductForCheckout(product, cartItem);

            OrderItem orderItem = OrderItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .sku(product.getSku())
                    .imageUrl(product.getImageUrl())
                    .unitPrice(product.getPrice())
                    .quantity(cartItem.getQuantity())
                    .lineTotal(product.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())))
                    .build();
            order.addItem(orderItem);
        }

        recalculateTotals(order);
        CustomerOrder savedOrder = orderRepo.save(order);
        cartClient.clearCart(authorization);
        publishOrderCreated(savedOrder);

        return toResponse(savedOrder);
    }

    @Override
    public List<OrderResponse> getMyOrders(String authorization) {
        UserDto user = getCurrentUser(authorization);

        return orderRepo.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public OrderResponse getMyOrder(String authorization, Long orderId) {
        UserDto user = getCurrentUser(authorization);
        CustomerOrder order = getOrder(orderId);

        if (!user.getId().equals(order.getUserId()) && !isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to current user");
        }

        return toResponse(order);
    }

    @Override
    public List<OrderResponse> getAllOrders() {
        return orderRepo.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public OrderResponse getOrderById(Long orderId) {
        return toResponse(getOrder(orderId));
    }

    @Override
    public OrderResponse updateOrderStatus(Long orderId, UpdateOrderStatusRequest request) {
        CustomerOrder order = getOrder(orderId);
        order.setStatus(request.getStatus());

        return toResponse(orderRepo.save(order));
    }

    @Override
    public OrderResponse updatePaymentStatus(PaymentUpdateRequest request) {
        CustomerOrder order = orderRepo.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        applyPaymentStatus(order, request.getPaymentStatus(), request.getPaymentReference());

        return toResponse(orderRepo.save(order));
    }

    @Override
    public OrderResponse cancelMyOrder(String authorization, Long orderId) {
        UserDto user = getCurrentUser(authorization);
        CustomerOrder order = getOrder(orderId);

        if (!user.getId().equals(order.getUserId()) && !isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to current user");
        }

        if (order.getStatus() == OrderStatus.SHIPPED || order.getStatus() == OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be cancelled after shipment");
        }

        order.setStatus(OrderStatus.CANCELLED);

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.REFUND_IN_PROGRESS);
            CustomerOrder savedOrder = orderRepo.save(order);
            publishRefundRequested(savedOrder);

            return toResponse(savedOrder);
        }

        return toResponse(orderRepo.save(order));
    }

    private UserDto getCurrentUser(String authorization) {
        try {
            UserDto user = userClient.getCurrentUser(authorization);
            log.info("User service resolved order user {} with id {}", user.getEmail(), user.getId());

            if (user.getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "User service /api/auth/me must return user id");
            }

            return user;
        } catch (FeignException.Unauthorized | FeignException.Forbidden e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User token is not accepted by user service");
        } catch (FeignException e) {
            log.warn("User service call failed with status {} and body {}", e.status(), e.contentUTF8());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "User service is not reachable");
        }
    }

    private CartDto getCart(String authorization) {
        try {
            return cartClient.getMyCart(authorization);
        } catch (FeignException e) {
            log.warn("Cart service call failed with status {} and body {}", e.status(), e.contentUTF8());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Cart service is not reachable");
        }
    }

    private ProductDto getProduct(Long productId) {
        try {
            return productClient.getProductById(productId);
        } catch (FeignException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found: " + productId);
        } catch (FeignException e) {
            log.warn("Product service call failed with status {} and body {}", e.status(), e.contentUTF8());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Product service is not reachable");
        }
    }

    private CustomerOrder getOrder(Long orderId) {
        return orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private void validateProductForCheckout(ProductDto product, CartItemDto cartItem) {
        if (product.getActive() == Boolean.FALSE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product is not active: " + product.getName());
        }

        if (product.getQuantity() != null && cartItem.getQuantity() > product.getQuantity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested quantity exceeds stock for " + product.getName());
        }
    }

    private void recalculateTotals(CustomerOrder order) {
        int totalQuantity = order.getItems().stream()
                .mapToInt(OrderItem::getQuantity)
                .sum();
        BigDecimal totalAmount = order.getItems().stream()
                .map(OrderItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        order.setTotalQuantity(totalQuantity);
        order.setTotalAmount(totalAmount);
    }

    private void applyPaymentStatus(CustomerOrder order, PaymentStatus paymentStatus, String paymentReference) {
        order.setPaymentStatus(paymentStatus);
        order.setPaymentReference(paymentReference);

        if (paymentStatus == PaymentStatus.PAID) {
            if (order.getStatus() == OrderStatus.CANCELLED) {
                order.setPaymentStatus(PaymentStatus.REFUND_IN_PROGRESS);
                publishRefundRequested(order);
            } else {
                order.setStatus(OrderStatus.CONFIRMED);
            }
        } else if (paymentStatus == PaymentStatus.FAILED) {
            order.setStatus(OrderStatus.PAYMENT_FAILED);
        } else if (paymentStatus == PaymentStatus.REFUND_IN_PROGRESS || paymentStatus == PaymentStatus.REFUNDED) {
            order.setStatus(OrderStatus.CANCELLED);
        }
    }

    private void publishOrderCreated(CustomerOrder order) {
        orderEventPublisher.publishOrderCreated(OrderCreatedEvent.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .userEmail(order.getUserEmail())
                .totalAmount(order.getTotalAmount())
                .totalQuantity(order.getTotalQuantity())
                .build());
    }

    private void publishRefundRequested(CustomerOrder order) {
        orderEventPublisher.publishRefundRequested(RefundRequestedEvent.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .userEmail(order.getUserEmail())
                .totalAmount(order.getTotalAmount())
                .build());
    }

    private OrderResponse toResponse(CustomerOrder order) {
        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .userEmail(order.getUserEmail())
                .status(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .totalQuantity(order.getTotalQuantity())
                .totalAmount(order.getTotalAmount())
                .shippingAddress(order.getShippingAddress())
                .contactPhone(order.getContactPhone())
                .paymentReference(order.getPaymentReference())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(order.getItems().stream().map(this::toItemResponse).toList())
                .build();
    }

    private OrderItemResponse toItemResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(item.getProductName())
                .sku(item.getSku())
                .imageUrl(item.getImageUrl())
                .unitPrice(item.getUnitPrice())
                .quantity(item.getQuantity())
                .lineTotal(item.getLineTotal())
                .build();
    }

    private String generateOrderNumber() {
        return "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
