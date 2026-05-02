package com.deepakraj.payment.service;

import com.deepakraj.payment.event.PaymentUpdatedEvent;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

public interface PaymentEventPublisher {
    void publishPaymentUpdated(PaymentUpdatedEvent event);
}

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
class KafkaPaymentEventPublisher implements PaymentEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.payment-updated-topic}")
    private String paymentUpdatedTopic;

    @Override
    public void publishPaymentUpdated(PaymentUpdatedEvent event) {
        kafkaTemplate.send(paymentUpdatedTopic, event.getOrderNumber(), toJson(event));
        log.info("Published payment update {} for {}", event.getPaymentStatus(), event.getOrderNumber());
    }

    private String toJson(PaymentUpdatedEvent event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (JacksonException e) {
            throw new IllegalStateException("Unable to serialize Kafka event", e);
        }
    }
}

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "false", matchIfMissing = true)
@Slf4j
class NoopPaymentEventPublisher implements PaymentEventPublisher {

    @Override
    public void publishPaymentUpdated(PaymentUpdatedEvent event) {
        log.info("Kafka disabled. Skipped payment update {} for {}", event.getPaymentStatus(), event.getOrderNumber());
    }
}
