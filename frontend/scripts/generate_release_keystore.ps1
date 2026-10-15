# MyUrbanDaily — Android Production Release Keystore Generator
# Run this script once to generate your official upload keystore for Google Play Console

param(
    [string]$KeystorePath = "d:\Users\Downloads\Urban Company\frontend\android\app\release.keystore",
    [string]$Alias = "myurbandaily",
    [string]$Password = "MyUrbanDaily@2026"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🔐 MyUrbanDaily Android Release Keystore Generator" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$keytoolCmd = Get-Command "keytool" -ErrorAction SilentlyContinue

if (-not $keytoolCmd) {
    # Check standard Java / Android Studio locations
    $asJdk = "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
    if (Test-Path $asJdk) {
        $keytoolCmd = $asJdk
    } else {
        Write-Host "❌ keytool not found in PATH or Android Studio directory." -ForegroundColor Red
        Write-Host "💡 Please run keytool from your JDK bin folder or Android Studio." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Generating release keystore at: $KeystorePath" -ForegroundColor Green

& $keytoolCmd -genkey -v `
    -keystore $KeystorePath `
    -alias $Alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $Password `
    -keypass $Password `
    -dname "CN=MyUrbanDaily Technologies, OU=Mobile Engineering, O=MyUrbanDaily, L=Sagara, ST=Karnataka, C=IN"

if (Test-Path $KeystorePath) {
    Write-Host "✅ Release Keystore successfully generated!" -ForegroundColor Green
    
    # Generate Base64 for GitHub Secrets
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KeystorePath))
    $b64Path = "$KeystorePath.base64.txt"
    $base64 | Out-File -FilePath $b64Path -Encoding ascii
    
    Write-Host "`n📋 GitHub Repository Secrets Configuration:" -ForegroundColor Yellow
    Write-Host "   1. ANDROID_KEYSTORE_BASE64  -> (Saved to $b64Path)" -ForegroundColor Cyan
    Write-Host "   2. KEYSTORE_PASSWORD       -> $Password" -ForegroundColor Cyan
    Write-Host "   3. KEY_ALIAS               -> $Alias" -ForegroundColor Cyan
    Write-Host "   4. KEY_PASSWORD            -> $Password" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to generate keystore." -ForegroundColor Red
}
