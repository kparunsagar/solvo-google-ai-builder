# ==============================================================================
# Google Cloud Run Deployment Script for Urban Daily (MyUrbanDaily)
# Target Region: asia-south1 (Mumbai)
# Free Tier Compliance: Scale-to-Zero, 2,000,000 monthly requests ($0.00 cost)
# ==============================================================================

param(
  [string]$ProjectId = "myurbandaily-458d0",
  [string]$Region = "asia-south1",
  [string]$ServiceName = "urbanai-backend"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Google Cloud Run Serverless Deployment" -ForegroundColor Cyan
Write-Host "   Service: $ServiceName" -ForegroundColor White
Write-Host "   Project: $ProjectId" -ForegroundColor White
Write-Host "   Region:  $Region (Mumbai)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Error: Google Cloud SDK ('gcloud') is not found in PATH." -ForegroundColor Red
  Write-Host "   Please install gcloud from https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
  exit 1
}

# 2. Set current project
Write-Host "🔧 Setting active project to $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# 3. Enable necessary Google Cloud APIs
Write-Host "⚡ Enabling Cloud Run, Cloud Build, and Artifact Registry APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

# 4. Deploy directly from source directory
Write-Host "📦 Submitting build and deploying to Cloud Run in $Region..." -ForegroundColor Green
gcloud run deploy $ServiceName `
  --source ./backend `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --min-instances 0 `
  --max-instances 10 `
  --concurrency 80 `
  --cpu 1 `
  --memory 512Mi `
  --port 5000 `
  --set-env-vars "NODE_ENV=production,CLOUD_RUN_REGION=$Region"

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Deployment successful!" -ForegroundColor Green
  $serviceUrl = gcloud run services describe $ServiceName --region $Region --format 'value(status.url)'
  Write-Host "🌐 Live Cloud Run URL: $serviceUrl" -ForegroundColor Cyan
  Write-Host "🩺 Health Endpoint:  $serviceUrl/healthz" -ForegroundColor White
  Write-Host "🤖 AI Status:        $serviceUrl/api/cloudrun/status" -ForegroundColor White
} else {
  Write-Host "❌ Deployment encountered an error. Please verify Google Cloud permissions." -ForegroundColor Red
}
