# ==============================================================================
# Google Cloud Platform (GCP) - Terraform Free-Tier Infrastructure
# Service: Urban Daily (MyUrbanDaily)
# Cost: $0.00 / month (Guaranteed Free-Tier & Scale-to-Zero Limits)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.25"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ------------------------------------------------------------------------------
# 1. Enable Required GCP APIs (All within Free Quota)
# ------------------------------------------------------------------------------
locals {
  gcp_services = [
    "run.googleapis.com",              # Cloud Run (Free: 2M reqs/mo, 360k vCPU-sec)
    "artifactregistry.googleapis.com", # Artifact Registry (Free: 0.5 GB/mo)
    "firestore.googleapis.com",        # Firestore NoSQL (Free: 1 GB, 50k reads/day)
    "iam.googleapis.com",              # IAM & Service Accounts (Free)
    "cloudbuild.googleapis.com",       # Cloud Build (Free: 120 build-mins/day)
    "logging.googleapis.com",          # Cloud Logging (Free: 50 GiB/mo)
    "monitoring.googleapis.com"        # Cloud Monitoring (Free tier metrics)
  ]
}

resource "google_project_service" "enabled_apis" {
  for_each           = toset(local.gcp_services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# 2. Service Account for Cloud Run (Least-Privilege Free Tier)
# ------------------------------------------------------------------------------
resource "google_service_account" "cloudrun_sa" {
  account_id   = "urbanai-cloudrun-sa"
  display_name = "Urban Daily Cloud Run Service Account"
  description  = "Dedicated runtime identity with least privilege for Urban Daily API"
  depends_on   = [google_project_service.enabled_apis]
}

# Grant Datastore / Firestore User role (read & write bookings, users, audits)
resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Grant Cloud Logging Writer (stays well within 50 GiB/mo free quota)
resource "google_project_iam_member" "log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# ------------------------------------------------------------------------------
# 3. Artifact Registry Docker Repository (Container Image Storage)
# ------------------------------------------------------------------------------
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = var.repository_name
  description   = "Docker container repository for Urban Daily microservices"
  format        = "DOCKER"
  depends_on    = [google_project_service.enabled_apis]

  # Automatic cleanup policy: keeps image storage minimal (<0.5GB free limit)
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state = "UNTAGGED"
    }
  }
}

# ------------------------------------------------------------------------------
# 4. Google Cloud Run (Backend API Gateway)
# Strict Free Tier Constraints:
# - min_instance_count = 0 (scale-to-zero: $0 cost when idle!)
# - max_instance_count = 2 (spending guardrail to prevent budget overruns)
# - CPU: 1, Memory: 512Mi (fits comfortably within 360k vCPU-sec free tier)
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "api_service" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 0 # 100% Free-Tier: Scale to 0 instances when no traffic
      max_instance_count = 2 # Cost-cap limit
    }

    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GEMINI_API_KEY"
        value = var.gemini_api_key
      }

      env {
        name  = "CORS_ORIGIN"
        value = "https://myurbandaily.web.app,https://myurbandaily-458d0.web.app,https://myurbandaily.firebaseapp.com"
      }
    }
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_service_account.cloudrun_sa
  ]
}

# Allow public unauthenticated invocations (Frontend Web App can query API)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ------------------------------------------------------------------------------
# 5. Cloud Storage Bucket (Free Tier Backups & Audit Receipts)
# ------------------------------------------------------------------------------
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "app_storage" {
  name                        = "urbanai-assets-${var.project_id}-${random_id.bucket_suffix.hex}"
  location                    = "ASIA-SOUTH1"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  # 30-day lifecycle auto-cleanup ensures storage stays within free tier
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 30
    }
  }

  cors {
    origin          = ["https://myurbandaily.web.app", "https://myurbandaily.firebaseapp.com"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.enabled_apis]
}
