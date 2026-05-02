package com.deepakraj.order.component;

import com.deepakraj.order.dto.PaymentUpdateRequest;
import com.deepakraj.order.event.PaymentUpdatedEvent;
import com.deepakraj.order.service.OrderService;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class PaymentUpdatedListener {

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.payment-updated-topic}", groupId = "order-service")
    public void handlePaymentUpdated(String payload) {
        PaymentUpdatedEvent event = fromJson(payload);
        log.info("Received payment update for order {}", event.getOrderNumber());
        PaymentUpdateRequest request = new PaymentUpdateRequest();
        request.setOrderNumber(event.getOrderNumber());
        request.setPaymentStatus(event.getPaymentStatus());
        request.setPaymentReference(event.getPaymentReference());

        orderService.updatePaymentStatus(request);
    }

    private PaymentUpdatedEvent fromJson(String payload) {
        try {
            return objectMapper.readValue(payload, PaymentUpdatedEvent.class);
        } catch (JacksonException e) {
            throw new IllegalArgumentException("Unable to deserialize payment update event", e);
        }
    }
}
