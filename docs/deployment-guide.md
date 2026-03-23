# MAAST Deployment Guide

## Server Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| OS | Windows Server 2016 | Windows Server 2019/2022 |
| RAM | 4 GB | 8 GB |
| CPU | 2 cores | 4 cores |
| Disk | 20 GB | 50 GB |
| Network | LAN access to SQL Server | Gigabit LAN |

> **Note:** MAAST is currently designed for **Windows Server + IIS deployment** using iisnode. A Linux/PM2 deployment is possible with minor configuration changes (see notes below).

---

## Windows Server + IIS Deployment (Primary)

### Step 1: Install Prerequisites

```powershell
# Install Node.js (use official installer from nodejs.org, v18+)
# Verify installation
node --version
npm --version

# Install IIS (via Server Manager or PowerShell)
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Install iisnode (download from https://github.com/azure/iisnode/releases)
# Run the iisnode installer (iisnode-core-v0.x.x-x64.msi)

# Install URL Rewrite Module for IIS (required by iisnode)
# Download from: https://www.iis.net/downloads/microsoft/url-rewrite
```

### Step 2: Deploy Application Files

```powershell
# Clone or copy the project to the web root
# Recommended path:
$projectPath = "C:\inetpub\wwwroot\MAAST"

# Create directory
New-Item -ItemType Directory -Force -Path $projectPath

# Copy project files (backend + master)
Copy-Item -Path ".\backend\*" -Destination "$projectPath\backend\" -Recurse
Copy-Item -Path ".\master\*" -Destination "$projectPath\master\" -Recurse
```

### Step 3: Install Node Dependencies

```powershell
cd C:\inetpub\wwwroot\MAAST\backend
npm install --production

cd C:\inetpub\wwwroot\MAAST\master
npm install
npm run build
```

### Step 4: Configure Environment Variables

Create `C:\inetpub\wwwroot\MAAST\backend\.env`:

```env
DB_USER=your_sql_user
DB_PASSWORD=YourStrongP@ssword!
DB_SERVER=192.168.x.x
DB_DATABASE=MSSCOSEC
DB_PORT=1433
PORT=5000
```

> ⚠️ Secure the `.env` file with file system ACLs — restrict to IIS AppPool identity only.

### Step 5: Configure IIS Application

1. Open **IIS Manager**
2. Right-click **Sites → Add Website**:
   - **Site name:** MAAST
   - **Physical path:** `C:\inetpub\wwwroot\MAAST\backend`
   - **Port:** 443 (HTTPS) or 80
3. Under **Application Pool**, set the Identity to a user with SQL Server access (or use Windows Authentication)

### Step 6: Configure `web.config`

The `backend/web.config` handles iisnode routing. Verify it contains:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public/{R:0}" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
          </conditions>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True" />
          </conditions>
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="524288000" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

### Step 7: Firewall Rules

```powershell
# Allow HTTPS
New-NetFirewallRule -DisplayName "MAAST HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow HTTP (redirect to HTTPS)
New-NetFirewallRule -DisplayName "MAAST HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow SQL Server (internal only — if app server is separate from DB)
New-NetFirewallRule -DisplayName "SQL Server" -Direction Outbound -Protocol TCP -RemotePort 1433 -Action Allow
```

### Step 8: SSL Certificate (Self-Signed for Intranet)

```powershell
# Generate self-signed certificate for intranet use
$cert = New-SelfSignedCertificate `
  -DnsName "192.168.2.54", "maast.internal" `
  -CertStoreLocation "cert:\LocalMachine\My" `
  -NotAfter (Get-Date).AddYears(5)

# In IIS Manager:
# Site → Bindings → Add → HTTPS, select the cert above
```

For public-facing deployment, use **Let's Encrypt** (certbot on Windows):
```powershell
# Install certbot for Windows from https://certbot.eff.org/instructions?os=windows
certbot certonly --webroot -w C:\inetpub\wwwroot\MAAST\backend -d yourdomain.com
```

---

## Linux Server Deployment (Alternative — PM2)

If deploying on Linux (Ubuntu):

### Step 1: Install Node.js & PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo npm install -g pm2
```

> ⚠️ The default `mssql` config uses `msnodesqlv8` driver which is Windows-only. For Linux, change the config in `server.js`:

```javascript
// In server.js, change the config options:
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    trustServerCertificate: true,
    encrypt: false
    // Remove: driver: "msnodesqlv8"
    // Remove: trustedConnection: true
  }
};
```

### Step 2: Build & Start

```bash
cd /var/www/MAAST/master
npm install && npm run build

cd /var/www/MAAST/backend
npm install --production

# Start with PM2
pm2 start server.js --name maast-api

# Auto-start on reboot
pm2 startup
pm2 save
```

### Step 3: Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/maast
server {
    listen 80;
    server_name maast.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name maast.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/maast.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/maast.yourdomain.com/privkey.pem;

    # Increase body size for file uploads
    client_max_body_size 500m;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/maast /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Environment Variables on Production

Store in `/etc/environment` or a secured `.env` file:

```env
NODE_ENV=production
DB_USER=sql_user
DB_PASSWORD=SecurePassword!
DB_SERVER=192.168.x.x
DB_DATABASE=MSSCOSEC
DB_PORT=1433
PORT=5000
```

Never store sensitive values in source control. Use IIS Application Pool environment variables or a secrets manager for enhanced security.

---

## PM2 Process Manager Config (Linux Reference)

Create `ecosystem.config.js` in the backend folder:

```javascript
module.exports = {
  apps: [{
    name: 'maast-api',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
```

```bash
pm2 start ecosystem.config.js --env production
```

---

## Health Check

The server exposes a simple health check endpoint:

```
GET /api/test
→ 200: { "message": "Server is working!" }
```

You can configure IIS Application Request Routing or an uptime monitor to ping this endpoint.

**Automated check example (PowerShell):**
```powershell
$response = Invoke-WebRequest -Uri "https://192.168.2.54/api/test" -UseBasicParsing
if ($response.StatusCode -ne 200) {
    Send-MailMessage -To "admin@company.com" -Subject "MAAST API Down!" -Body "Health check failed"
}
```

---

## Post-Deployment Checklist

- [ ] Environment variables set and `.env` file secured
- [ ] Node dependencies installed (`npm install --production`)
- [ ] React frontend built (`npm run build`)
- [ ] IIS application pool started
- [ ] SQL Server connection verified (`GET /api/test`)
- [ ] Login flow tested with admin and employee accounts
- [ ] File upload tested (shift Excel with 100+ rows)
- [ ] Attendance page loads with correct date
- [ ] HTTPS certificate valid
- [ ] Firewall rules in place
- [ ] Backup schedule configured for SQL Server
