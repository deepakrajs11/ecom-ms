package com.deepakraj.payment.component;

import com.deepakraj.payment.event.OrderCreatedEvent;
import com.deepakraj.payment.service.PaymentService;
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
public class OrderCreatedListener {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.order-created-topic}", groupId = "payment-service")
    public void handleOrderCreated(String payload) {
        OrderCreatedEvent event = fromJson(payload);
        log.info("Received order created event for {}", event.getOrderNumber());
        paymentService.handleOrderCreated(event);
    }

    private OrderCreatedEvent fromJson(String payload) {
        try {
            return objectMapper.readValue(payload, OrderCreatedEvent.class);
        } catch (JacksonException e) {
            throw new IllegalArgumentException("Unable to deserialize order created event", e);
        }
    }
}
