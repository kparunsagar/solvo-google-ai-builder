# ==============================================================================
# Google Cloud Platform (GCP) - Terraform Variables
# 100% Free-Tier Architecture for Urban Daily (MyUrbanDaily)
# ==============================================================================

variable "project_id" {
  description = "The Google Cloud Project ID (e.g., myurbandaily-458d0)"
  type        = string
  default     = "myurbandaily-458d0"
}

variable "region" {
  description = "GCP Region for Cloud Run & Artifact Registry. Free tier includes us-central1, us-east1, us-west1 or asia-south1."
  type        = string
  default     = "asia-south1"
}

variable "service_name" {
  description = "Cloud Run service name for Urban Daily API Gateway"
  type        = string
  default     = "urbanai-backend"
}

variable "repository_name" {
  description = "Artifact Registry Docker repository name"
  type        = string
  default     = "urbanai-docker-repo"
}

variable "environment" {
  description = "Deployment environment (production / staging)"
  type        = string
  default     = "production"
}

variable "container_image" {
  description = "Container image to deploy. Defaults to bootstrap public image if first run."
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "gemini_api_key" {
  description = "Google Gemini 1.5 Flash API Key (stays in free tier: 15 RPM / 1500 RPD)"
  type        = string
  default     = ""
  sensitive   = true
}
