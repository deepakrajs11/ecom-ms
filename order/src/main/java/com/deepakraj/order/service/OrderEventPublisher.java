package com.deepakraj.order.service;

import com.deepakraj.order.event.OrderCreatedEvent;
import com.deepakraj.order.event.RefundRequestedEvent;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

public interface OrderEventPublisher {
    void publishOrderCreated(OrderCreatedEvent event);

    void publishRefundRequested(RefundRequestedEvent event);
}

@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
class KafkaOrderEventPublisher implements OrderEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.kafka.order-created-topic}")
    private String orderCreatedTopic;

    @Value("${app.kafka.refund-requested-topic}")
    private String refundRequestedTopic;

    @Override
    public void publishOrderCreated(OrderCreatedEvent event) {
        kafkaTemplate.send(orderCreatedTopic, event.getOrderNumber(), toJson(event));
        log.info("Published order created event for {}", event.getOrderNumber());
    }

    @Override
    public void publishRefundRequested(RefundRequestedEvent event) {
        kafkaTemplate.send(refundRequestedTopic, event.getOrderNumber(), toJson(event));
        log.info("Published refund requested event for {}", event.getOrderNumber());
    }

    private String toJson(Object event) {
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
class NoopOrderEventPublisher implements OrderEventPublisher {

    @Override
    public void publishOrderCreated(OrderCreatedEvent event) {
        log.info("Kafka disabled. Skipped order created event for {}", event.getOrderNumber());
    }

    @Override
    public void publishRefundRequested(RefundRequestedEvent event) {
        log.info("Kafka disabled. Skipped refund requested event for {}", event.getOrderNumber());
    }
}
