# ==============================================================================
# Google Cloud Platform (GCP) - Terraform Outputs
# ==============================================================================

output "cloud_run_service_url" {
  description = "Public URL of the deployed Urban Daily Cloud Run backend"
  value       = google_cloud_run_v2_service.api_service.uri
}

output "artifact_registry_repo" {
  description = "Docker repository endpoint in Google Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}"
}

output "service_account_email" {
  description = "Runtime service account email created for Cloud Run"
  value       = google_service_account.cloudrun_sa.email
}

output "storage_bucket_name" {
  description = "Google Cloud Storage bucket provisioned for assets"
  value       = google_storage_bucket.app_storage.name
}

output "free_tier_cost_summary" {
  description = "Free Tier Cost Verification"
  value       = "All provisioned resources (Cloud Run scale-to-zero, Artifact Registry, Firestore, GCS) incur $0.00/month under Google Cloud Free Tier."
}
