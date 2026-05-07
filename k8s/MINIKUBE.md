# Minikube Deployment

This guide is for your local WSL Minikube cluster with two nodes and Cilium as the CNI.

The base manifests in `k8s/` are still suitable for pushed Docker Hub images when applied one-by-one. The `k8s/kustomization.yaml` file is for local Minikube development: it uses images built into Minikube and switches PVCs to Minikube's default `standard` storage class.

## 1. Check the cluster

Run these from WSL:

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system
kubectl get storageclass
```

You should see both `minikube` and `minikube-m02` as `Ready`, Cilium pods running in `kube-system`, and a default storage class named `standard`.

## 2. Enable ingress-nginx

Use Minikube's ingress addon:

```bash
minikube addons enable ingress
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=180s
kubectl get pods -n ingress-nginx
```

This is compatible with Cilium as the CNI. Cilium handles pod networking; ingress-nginx handles HTTP routing for the `Ingress` object.

## 3. Create the application secret

Use real values for your local setup:

```bash
kubectl apply -f k8s/00-namespace.yaml

kubectl create secret generic app-secrets \
  -n ecom \
  --from-literal=POSTGRES_USER='ecom' \
  --from-literal=POSTGRES_PASSWORD='ecom_password' \
  --from-literal=JWT_SECRET='change-me-to-a-long-random-secret-of-at-least-32-chars' \
  --from-literal=MAIL_ID='' \
  --from-literal=MAIL_PASSWORD='' \
  --dry-run=client -o yaml | kubectl apply -f -
```

For anything beyond local testing, replace the password and JWT secret.

## 4. Build images inside Minikube

From the repository root:

```bash
minikube image build --all -t ecom-user:local --build-opt build-arg=SERVICE=user -f Dockerfile .
minikube image build --all -t ecom-product:local --build-opt build-arg=SERVICE=product -f Dockerfile .
minikube image build --all -t ecom-cart:local --build-opt build-arg=SERVICE=cart -f Dockerfile .
minikube image build --all -t ecom-order:local --build-opt build-arg=SERVICE=order -f Dockerfile .
minikube image build --all -t ecom-payment:local --build-opt build-arg=SERVICE=payment -f Dockerfile .
minikube image build --all -t ecom-frontend:local -f Dockerfile frontend
```

The `--all` flag loads the image on both Minikube nodes, which avoids image pull issues when pods land on the worker.

## 5. Deploy the stack

```bash
kubectl apply -k k8s
kubectl get pods -n ecom -w
```

Wait until Postgres, Kafka, `kafka-init`, all five APIs, and the frontend are ready or completed.

## 6. Access the app through ingress

Find the Minikube IP:

```bash
minikube ip
```

Add this to `/etc/hosts` inside WSL:

```text
<MINIKUBE_IP> ecom.local
```

Then open or curl:

```bash
curl -H 'Host: ecom.local' http://$(minikube ip)/
curl http://ecom.local/
```

If your browser runs on Windows and cannot reach the Minikube IP directly from WSL, use:

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8088:80
```

Then add this to the Windows hosts file:

```text
127.0.0.1 ecom.local
```

Open:

```text
http://ecom.local:8088
```

## 7. Useful checks

```bash
kubectl get ingress -n ecom
kubectl describe ingress ecom-ingress -n ecom
kubectl get svc,pods,jobs,pvc -n ecom
kubectl logs -n ecom deploy/frontend
kubectl logs -n ecom deploy/user
kubectl logs -n ecom deploy/order
kubectl logs -n ecom job/kafka-init
```

## 8. Rebuild after code changes

Rebuild only the service you changed, then restart that deployment:

```bash
minikube image build --all -t ecom-user:local --build-opt build-arg=SERVICE=user -f Dockerfile .
kubectl rollout restart deployment/user -n ecom
kubectl rollout status deployment/user -n ecom
```

Use the matching image/deployment name for `product`, `cart`, `order`, `payment`, or `frontend`.

## 9. Clean reset

This removes the app namespace and data volumes:

```bash
kubectl delete namespace ecom
```

Then repeat from step 3.
