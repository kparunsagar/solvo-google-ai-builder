# Production Deployment Guide: Custom Domain, Cloudflare Edge & Docker CI/CD

A complete blueprint for buying a custom domain, routing traffic through Cloudflare (Zone 2), and deploying your Dockerized microservices in production.

---

## 🌐 1. Buying & Registering a Domain Name

### Recommended Domain Names for Sagara & Karnataka:
- `urbanai.in` / `urbanai.services` / `urbanai.tech`
- `sagaraservices.in` / `sagaraservices.com`

### Best Registrars:
1. **Namecheap** ([namecheap.com](https://www.namecheap.com)) — Free lifetime WHOIS privacy.
2. **Cloudflare Registrar** ([cloudflare.com/products/registrar](https://www.cloudflare.com/products/registrar)) — Zero markup wholesale pricing.
3. **Porkbun** ([porkbun.com](https://porkbun.com)) — Inexpensive `.in` and `.com` extensions.

---

## 🛡️ 2. Connecting Cloudflare (Zone 2 - Edge Security & WAF)

Cloudflare gives your platform free DDoS mitigation, Web Application Firewall (WAF), and global CDN caching.

1. Create a free account at **[cloudflare.com](https://dash.cloudflare.com/sign-up)**.
2. Click **"Add a Site"** and enter your registered domain (e.g. `urbanai.in`).
3. Select the **Free Tier**.
4. In your domain registrar (Namecheap / GoDaddy / Porkbun), update the default nameservers to Cloudflare's nameservers:
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`
5. Under Cloudflare **DNS Settings**, configure the following records:

| Type | Name | Content / IPv4 | Proxy status | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (root) | `<Your_Server_Public_IP>` | 🟠 Proxied | Frontend Web PWA |
| **A** | `api` | `<Your_Server_Public_IP>` | 🟠 Proxied | Backend & WebSocket Gateway |
| **CNAME** | `www` | `urbanai.in` | 🟠 Proxied | Canonical redirect |

6. In Cloudflare **SSL/TLS Settings**: Set encryption mode to **Full (Strict)**.

---

## 🐳 3. Automated Docker CI/CD via GitHub Actions

The workflow file `.github/workflows/deploy.yml` builds and pushes your Docker images automatically to **GitHub Container Registry (GHCR)** on every commit to `main`:
- `ghcr.io/kparunsagar/urbanai-frontend:latest`
- `ghcr.io/kparunsagar/urbanai-backend:latest`
- `ghcr.io/kparunsagar/urbanai-tracking:latest`

### Production Server 1-Click Launch:
On any Ubuntu server / VPS (AWS EC2, DigitalOcean, Hetzner, or Railway):
```bash
# 1. Install Docker & Compose
curl -fsSL https://get.docker.com | sh

# 2. Clone your repository
git clone https://github.com/kparunsagar/urbanai.git
cd urbanai

# 3. Start all microservices in production mode
docker compose up -d --build
```
Your frontend, backend API, Python bike tracking telemetry, PostgreSQL, and Redis will start up automatically.
