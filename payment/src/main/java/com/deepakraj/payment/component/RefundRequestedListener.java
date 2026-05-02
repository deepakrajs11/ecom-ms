package com.deepakraj.payment.component;

import com.deepakraj.payment.event.RefundRequestedEvent;
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
public class RefundRequestedListener {

    private final PaymentService paymentService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.refund-requested-topic}", groupId = "payment-service")
    public void handleRefundRequested(String payload) {
        RefundRequestedEvent event = fromJson(payload);
        log.info("Received refund requested event for {}", event.getOrderNumber());
        paymentService.handleRefundRequested(event);
    }

    private RefundRequestedEvent fromJson(String payload) {
        try {
            return objectMapper.readValue(payload, RefundRequestedEvent.class);
        } catch (JacksonException e) {
            throw new IllegalArgumentException("Unable to deserialize refund requested event", e);
        }
    }
}
