# Containerization

Create a local env file first:

```bash
cp .env.example .env
```

Update `JWT_SECRET` in `.env` before running the stack. Add `MAIL_ID` and `MAIL_PASSWORD` only if you want the email OTP/password reset flow to send mail.

Start everything:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Product API: http://localhost:8080
- User API: http://localhost:8081
- Cart API: http://localhost:8082
- Order API: http://localhost:8083
- Payment API: http://localhost:8084
- Kafka UI: http://localhost:8090

The compose stack includes Postgres, Kafka, topic initialization, all five Spring Boot services, and the React frontend served by nginx.

If Postgres was already started before these files existed, recreate the database volume so the service databases are initialized:

```bash
docker compose down -v
docker compose up --build
```
