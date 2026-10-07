# Deployment Guide: Miakhil Family Finance

This guide provides step-by-step instructions for deploying the **Miakhil Family Finance** management system into production.

---

## Architecture Overview
- **Framework**: Next.js 16 (App Router + React 19)
- **Database**: SQLite (stored in `./data/finance.db` via Node `DatabaseSync`)
- **Authentication**: Built-in 256-bit signed session cookies
  - **Username**: `miakhilfamily`
  - **Password**: `SMH07+++`
- **Data Persistence**: All family accounts, categories, and transactions live in the `./data` directory. Backing up `./data/finance.db` backs up the entire household system.

---

## Option 1: Docker Deployment (Recommended)

Docker provides the easiest, cleanest, and most reliable self-hosted deployment.

### Prerequisites
- Docker Engine & Docker Compose installed.

### Steps

1. **Clone or transfer the project files to your server**:
   ```bash
   cd /path/to/finance
   ```

2. **Launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

3. **Verify running status**:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

4. **Access the application**:
   Open `http://YOUR_SERVER_IP:3000` in your web browser.

> **Data Safety Note**: The `./data` folder on your host machine is mounted into the container at `/app/data`. Even when you update, rebuild, or restart the container, all your financial records remain completely preserved.

---

## Option 2: VPS Self-Hosting with PM2 & Nginx (Ubuntu / Debian)

If running directly on a Linux VPS (DigitalOcean, Hetzner, Linode, AWS EC2, etc.):

### Step 1: Install Node.js 22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

### Step 3: Build the Application
```bash
cd /var/www/finance
npm ci
npm run build
```

### Step 4: Run with PM2
```bash
pm2 start npm --name "miakhil-finance" -- run start -- -p 3000
pm2 save
pm2 startup
```

### Step 5: Setup Nginx Reverse Proxy with Free SSL (Let's Encrypt)
Create `/etc/nginx/sites-available/finance`:
```nginx
server {
    server_name finance.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain SSL:
```bash
sudo ln -s /etc/nginx/sites-available/finance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d finance.yourdomain.com
```

---

## Option 3: Cloud PaaS (Railway, Render, Fly.io)

When deploying to cloud platforms with ephemeral containers, you **must attach a persistent volume** to `/app/data`:

### Deploying on Railway
1. Push your repository to GitHub.
2. Link the repository in [Railway.app](https://railway.app).
3. Under **Service Settings** -> **Volumes**, add a persistent volume mounted to:
   - **Mount Path**: `/app/data`
4. Deploy!

### Deploying on Render
1. Create a **Web Service** with the Docker environment.
2. Under **Disks**, add a persistent disk:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB+

---

## Household Database Backups

Because the entire system relies on SQLite, creating a backup is instantaneous:

### Manual Backup
```bash
cp data/finance.db data/finance_backup_$(date +%Y%m%d).db
```

### Automated Daily Backup via Cron
Add this line to your server `crontab -e`:
```bash
0 2 * * * cp /path/to/finance/data/finance.db /path/to/backups/finance_$(date +\%Y\%m\%d).db
```

---

## Upgrades & Maintenance
To update the application in the future:
```bash
git pull
docker compose down
docker compose up -d --build
```
Your financial ledger in `./data` will automatically migrate and retain all records intact.
