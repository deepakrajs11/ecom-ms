# Kubernetes Deployment Workflow

This workflow deploys the complete e-commerce stack to the local Minikube cluster using Docker Hub images.

## Apply Command

```bash
kubectl apply -f k8s/ecom-dockerhub.yaml
kubectl get pods -n ecom -w
```

## Workflow Diagram

```mermaid
flowchart TD
    A[Docker Hub Images] --> B[kubectl apply -f k8s/ecom-dockerhub.yaml]
    B --> C[ecom Namespace]
    C --> D[ConfigMap: app-config]
    C --> E[Secret: app-secrets]
    C --> F[Postgres PVC]
    C --> G[Kafka PVC]

    F --> H[Postgres Deployment]
    G --> I[Kafka Deployment]

    H --> J[Postgres Service]
    I --> K[Kafka Service]
    K --> L[Kafka Init Job]
    L --> M[Kafka Topics]

    J --> N[User API]
    J --> O[Product API]
    J --> P[Cart API]
    J --> Q[Order API]
    J --> R[Payment API]

    K --> Q
    K --> R
    M --> Q
    M --> R

    N --> S[User Service]
    O --> T[Product Service]
    P --> U[Cart Service]
    Q --> V[Order Service]
    R --> W[Payment Service]

    S --> X[Frontend Nginx]
    T --> X
    U --> X
    V --> X
    W --> X

    X --> Y[Frontend Service]
    Y --> Z[Ingress: ecom.local]
    Z --> AA[ingress-nginx NodePort or port-forward]
    AA --> AB[Browser or Postman]
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client as Browser/Postman
    participant Ingress as ingress-nginx
    participant FE as Frontend Nginx
    participant User as User API
    participant Product as Product API
    participant Cart as Cart API
    participant Order as Order API
    participant Payment as Payment API
    participant DB as Postgres
    participant Kafka as Kafka

    Client->>Ingress: HTTP request with Host ecom.local
    Ingress->>FE: Route /
    FE->>User: /api/auth and /api/users
    FE->>Product: /api/products
    FE->>Cart: /api/cart
    FE->>Order: /api/orders
    FE->>Payment: /api/payments
    User->>DB: userdb
    Product->>DB: productdb
    Cart->>DB: cartdb
    Order->>DB: orderdb
    Payment->>DB: paymentdb
    Order->>Kafka: order.created, refund.requested
    Payment->>Kafka: payment.updated
```

## Access Options

NodePort from WSL:

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
curl -H 'Host: ecom.local' http://$(minikube ip):<NODE_PORT>/
```

Port-forward for Windows browser or Postman:

```bash
kubectl port-forward --address 0.0.0.0 -n ingress-nginx svc/ingress-nginx-controller 8088:80
```

Then call:

```text
http://127.0.0.1:8088
```

Use this header for API clients when calling by IP or localhost:

```text
Host: ecom.local
```
