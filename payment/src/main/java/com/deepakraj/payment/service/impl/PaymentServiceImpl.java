package com.deepakraj.payment.service.impl;

import com.deepakraj.payment.dto.PaymentResponse;
import com.deepakraj.payment.event.OrderCreatedEvent;
import com.deepakraj.payment.event.PaymentUpdatedEvent;
import com.deepakraj.payment.event.RefundRequestedEvent;
import com.deepakraj.payment.model.Payment;
import com.deepakraj.payment.model.PaymentStatus;
import com.deepakraj.payment.repository.PaymentRepo;
import com.deepakraj.payment.service.PaymentEventPublisher;
import com.deepakraj.payment.service.PaymentService;
import jakarta.annotation.PreDestroy;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepo paymentRepo;
    private final PaymentEventPublisher paymentEventPublisher;
    private final ScheduledExecutorService executorService = Executors.newSingleThreadScheduledExecutor();

    @Value("${app.payment.simulation-delay-ms}")
    private long simulationDelayMs;

    @Override
    @Transactional
    public void handleOrderCreated(OrderCreatedEvent event) {
        Payment payment = paymentRepo.findByOrderNumber(event.getOrderNumber())
                .orElseGet(() -> Payment.builder()
                        .orderId(event.getOrderId())
                        .orderNumber(event.getOrderNumber())
                        .userId(event.getUserId())
                        .userEmail(event.getUserEmail())
                        .amount(event.getTotalAmount())
                        .status(PaymentStatus.PENDING)
                        .build());

        if (payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.PROCESSING);
            Payment savedPayment = paymentRepo.save(payment);
            publishUpdate(savedPayment, savedPayment.getPaymentReference());
            schedulePaymentSuccess(savedPayment.getOrderNumber());
        }
    }

    @Override
    @Transactional
    public void handleRefundRequested(RefundRequestedEvent event) {
        Payment payment = getPayment(event.getOrderNumber());

        if (payment.getStatus() == PaymentStatus.REFUNDED || payment.getStatus() == PaymentStatus.REFUND_IN_PROGRESS) {
            return;
        }

        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only paid orders can be refunded");
        }

        payment.setStatus(PaymentStatus.REFUND_IN_PROGRESS);
        Payment savedPayment = paymentRepo.save(payment);
        publishUpdate(savedPayment, savedPayment.getPaymentReference());
        scheduleRefundSuccess(savedPayment.getOrderNumber());
    }

    @Override
    @Transactional
    public PaymentResponse processOrderPayment(String orderNumber) {
        Payment payment = getPayment(orderNumber);

        if (payment.getStatus() == PaymentStatus.PAID) {
            return toResponse(payment);
        }

        if (payment.getStatus() != PaymentStatus.PENDING && payment.getStatus() != PaymentStatus.PROCESSING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment cannot be processed from current status");
        }

        payment.setStatus(PaymentStatus.PROCESSING);
        Payment savedPayment = paymentRepo.save(payment);
        publishUpdate(savedPayment, savedPayment.getPaymentReference());
        schedulePaymentSuccess(savedPayment.getOrderNumber());

        return toResponse(savedPayment);
    }

    @Override
    @Transactional
    public PaymentResponse refundOrderPayment(String orderNumber) {
        Payment payment = getPayment(orderNumber);

        if (payment.getStatus() == PaymentStatus.REFUNDED || payment.getStatus() == PaymentStatus.REFUND_IN_PROGRESS) {
            return toResponse(payment);
        }

        if (payment.getStatus() != PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only paid orders can be refunded");
        }

        payment.setStatus(PaymentStatus.REFUND_IN_PROGRESS);
        Payment savedPayment = paymentRepo.save(payment);
        publishUpdate(savedPayment, savedPayment.getPaymentReference());
        scheduleRefundSuccess(savedPayment.getOrderNumber());

        return toResponse(savedPayment);
    }

    @Override
    public List<PaymentResponse> getMyPayments() {
        return paymentRepo.findByUserEmailOrderByCreatedAtDesc(currentEmail())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public PaymentResponse getMyPaymentByOrderNumber(String orderNumber) {
        Payment payment = getPayment(orderNumber);

        if (!payment.getUserEmail().equals(currentEmail()) && !isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Payment does not belong to current user");
        }

        return toResponse(payment);
    }

    @Override
    public List<PaymentResponse> getAllPayments() {
        return paymentRepo.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public PaymentResponse getPaymentByOrderNumber(String orderNumber) {
        return toResponse(getPayment(orderNumber));
    }

    @PreDestroy
    public void shutdownExecutor() {
        executorService.shutdown();
    }

    private void schedulePaymentSuccess(String orderNumber) {
        executorService.schedule(() -> completePayment(orderNumber), simulationDelayMs, TimeUnit.MILLISECONDS);
    }

    private void scheduleRefundSuccess(String orderNumber) {
        executorService.schedule(() -> completeRefund(orderNumber), simulationDelayMs, TimeUnit.MILLISECONDS);
    }

    private void completePayment(String orderNumber) {
        paymentRepo.findByOrderNumber(orderNumber).ifPresent(payment -> {
            if (payment.getStatus() != PaymentStatus.PROCESSING) {
                return;
            }

            payment.setStatus(PaymentStatus.PAID);
            payment.setPaymentReference("PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            payment.setPaidAt(LocalDateTime.now());
            Payment savedPayment = paymentRepo.save(payment);
            publishUpdate(savedPayment, savedPayment.getPaymentReference());
            log.info("Payment completed for {}", orderNumber);
        });
    }

    private void completeRefund(String orderNumber) {
        paymentRepo.findByOrderNumber(orderNumber).ifPresent(payment -> {
            if (payment.getStatus() != PaymentStatus.REFUND_IN_PROGRESS) {
                return;
            }

            payment.setStatus(PaymentStatus.REFUNDED);
            payment.setRefundReference("REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            payment.setRefundedAt(LocalDateTime.now());
            Payment savedPayment = paymentRepo.save(payment);
            publishUpdate(savedPayment, savedPayment.getRefundReference());
            log.info("Refund completed for {}", orderNumber);
        });
    }

    private Payment getPayment(String orderNumber) {
        return paymentRepo.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private void publishUpdate(Payment payment, String reference) {
        paymentEventPublisher.publishPaymentUpdated(PaymentUpdatedEvent.builder()
                .orderNumber(payment.getOrderNumber())
                .paymentStatus(payment.getStatus())
                .paymentReference(reference)
                .build());
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrderId())
                .orderNumber(payment.getOrderNumber())
                .userId(payment.getUserId())
                .userEmail(payment.getUserEmail())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paymentReference(payment.getPaymentReference())
                .refundReference(payment.getRefundReference())
                .paidAt(payment.getPaidAt())
                .refundedAt(payment.getRefundedAt())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }

    private String currentEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }

        return authentication.getName();
    }

    private boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
