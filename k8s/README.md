# Kubernetes Deployment

This setup is designed for a kubeadm cluster on EC2. It will also work on local Kubernetes with an ingress controller.

## 1. Prepare Docker Hub image names

Replace `YOUR_DOCKERHUB_USERNAME` in the manifests:

```bash
grep -R "YOUR_DOCKERHUB_USERNAME" k8s
```

For example:

```yaml
image: your-dockerhub-user/ecom-order:1.0.0
```

## 2. Create the Secret

Secrets are stored in a Kubernetes `Secret`, not in the app `ConfigMap`. The committed file is only a template.

Option A: create the secret directly from your shell:

```bash
kubectl create secret generic app-secrets \
  -n ecom \
  --from-literal=POSTGRES_USER='ecom' \
  --from-literal=POSTGRES_PASSWORD='replace-with-a-strong-password' \
  --from-literal=JWT_SECRET='replace-with-a-long-random-secret-at-least-32-chars' \
  --from-literal=MAIL_ID='' \
  --from-literal=MAIL_PASSWORD=''
```

Option B: copy the example and edit real values:

```bash
cp k8s/02-secrets.example.yaml k8s/02-secrets.yaml
```

Update:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `MAIL_ID`
- `MAIL_PASSWORD`

Never commit `k8s/02-secrets.yaml`; it is ignored by git.

## 3. Install ingress-nginx

For a kubeadm cluster, install an ingress controller before applying the app ingress.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/baremetal/deploy.yaml
```

On EC2, open the NodePort ports created by ingress-nginx in the worker node security group, or place a load balancer in front of the worker nodes.

Check the ports:

```bash
kubectl get svc -n ingress-nginx
```

## 4. Install storage support

A kubeadm cluster on EC2 usually has no default storage provisioner. For a learning cluster, install local-path provisioner:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
kubectl patch storageclass local-path -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

For production, use the AWS EBS CSI driver instead of local-path storage.

## 5. Deploy the stack

Apply files in order:

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmaps.yaml
kubectl apply -f k8s/02-secrets.yaml
kubectl apply -f k8s/03-postgres.yaml
kubectl apply -f k8s/04-kafka.yaml
kubectl apply -f k8s/05-apps.yaml
kubectl apply -f k8s/06-ingress.yaml
```

## 6. Watch startup

```bash
kubectl get pods -n ecom -w
```

If something fails:

```bash
kubectl logs -n ecom deploy/order
kubectl describe pod -n ecom -l app=order
```

## 7. Access the app

The ingress host is:

```text
ecom.local
```

For quick testing, map it to one worker node public IP in your local hosts file:

```text
<EC2_WORKER_PUBLIC_IP> ecom.local
```

Then open:

```text
http://ecom.local:<INGRESS_NODE_PORT>
```

If you later attach a real domain and load balancer, point DNS to the load balancer and update `k8s/06-ingress.yaml`.

## Notes

- App config is injected through ConfigMaps and Secrets at deployment time.
- Docker Hub images do not contain environment-specific values.
- Kafka and Postgres use public images directly.
- For production, use managed Postgres and a proper Kafka installation such as Strimzi, Bitnami Kafka, MSK, or another managed Kafka service.
