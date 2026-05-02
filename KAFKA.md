# Local Kafka

Start Kafka from the project root:

```powershell
docker compose -f docker-compose.kafka.yml up -d
```

Kafka is exposed to the Spring Boot services at:

```text
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_ENABLED=true
```

The compose file creates the topics used by the order/payment flow:

```text
order.created
refund.requested
payment.updated
```

Kafka UI is available at:

```text
http://localhost:8090
```

Useful checks:

```powershell
docker compose -f docker-compose.kafka.yml ps
docker compose -f docker-compose.kafka.yml logs -f kafka
docker compose -f docker-compose.kafka.yml logs kafka-init
```

Stop Kafka:

```powershell
docker compose -f docker-compose.kafka.yml down
```

Remove Kafka data as well:

```powershell
docker compose -f docker-compose.kafka.yml down -v
```
