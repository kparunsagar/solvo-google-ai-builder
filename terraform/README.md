# Urban Daily - Google Cloud Platform Free-Tier Terraform Architecture

This Terraform configuration provisions the complete cloud backend infrastructure for **MyUrbanDaily (Urban Company AI)** using **100% Google Cloud Free Tier resources**.

---

## 🏛️ Provisioned Cloud Resources & Free-Tier Guarantees

| Resource | Service | Free Tier Limit | Configured In Terraform | Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API Gateway** | Google Cloud Run | 2M requests/month, 360,000 vCPU-seconds | `min_instances = 0` (scale-to-zero), `max_instances = 2`, `512Mi RAM` | **$0.00** |
| **Docker Container Repo** | Artifact Registry | 0.5 GB storage/month | Auto-cleanup policy keeping only 3 latest images | **$0.00** |
| **NoSQL Database** | Cloud Firestore | 1 GB storage, 50,000 reads/day, 20,000 writes/day | Native mode access via Service Account | **$0.00** |
| **Asset Storage** | Cloud Storage (GCS) | 5 GB standard storage | 30-day lifecycle auto-expiry | **$0.00** |
| **Identity & Access** | IAM & Service Accounts | Free unlimited | Dedicated least-privilege service account | **$0.00** |
| **Observability** | Cloud Logging & Monitoring | 50 GiB logs/month | Default standard logging | **$0.00** |

---

## 🚀 Quick Start (Local Run)

### 1. Prerequisites
- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install)
- [Terraform CLI (>= 1.5.0)](https://developer.hashicorp.com/terraform/downloads)

### 2. Authenticate with GCP
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project myurbandaily-458d0
```

### 3. Initialize & Deploy
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars

terraform init
terraform plan
terraform apply
```

---

## 🔄 Automated CI/CD Pipeline
Resources can also be provisioned automatically via GitHub Actions:
- Pipeline file: `.github/workflows/deploy-gcp-terraform.yml`
- Triggers on: pushes to `main` branch or manual trigger via `workflow_dispatch`.
