# Complete Deployment Guide: Miakhil Family Finance

This guide contains everything you need to deploy the **Miakhil Family Finance** application into production.

---

## 🔑 Your Login Credentials
When entering the application on any device, use:
* **Username:** `miakhilfamily`
* **Password:** `SMH07+++`

---

## 🚀 Choose Your Preferred Deployment Method

| Method | Best For | Complexity | Cost |
| :--- | :--- | :--- | :--- |
| **Option 1: Docker (Recommended)** | VPS, Home Server, Synology | ⚡ 1 command (`docker compose up -d`) | Free / Server cost |
| **Option 2: Cloud PaaS (Railway / Render)** | Zero server management | 🖱️ 5 clicks from GitHub | Free / Low cost |
| **Option 3: Linux VPS (PM2 + Nginx)** | Direct server hosting with custom domain | 🛠️ Standard Linux terminal | $4 - $6/mo VPS |
| **Option 4: Local Household Network** | Running on your own PC for home devices | ⚡ Local terminal command | 100% Free |

---

## Option 1: Docker Compose (Easiest & Cleanest)

If you have Docker installed on your server, PC, or VPS:

### Step 1: Open Terminal in the project root
```bash
cd finance
```

### Step 2: Start the application in the background
```bash
docker compose up -d --build
```

### Step 3: Access your application
Open your web browser and navigate to:
```text
http://YOUR_SERVER_IP:3000
```
*(or `http://localhost:3000` if running locally)*

### How to stop or restart:
* **Stop:** `docker compose down`
* **Restart:** `docker compose restart`
* **Check logs:** `docker compose logs -f`

> **Note on Data:** All your accounts and transactions are automatically saved in the `./data` folder on your host machine. They will never be lost when restarting or updating Docker containers.

---

## Option 2: Cloud Deployment (Railway or Render)

### Deploying on Railway (Recommended Cloud Platform)
1. Push this project folder to your GitHub account (private repository recommended).
2. Go to **[railway.app](https://railway.app)** and log in with GitHub.
3. Click **"New Project"** → **"Deploy from GitHub repo"** → Select your `finance` repository.
4. **Important for SQLite Data Persistence:**
   * Go to your deployed service → **Settings** → **Volumes**.
   * Click **"Add Volume"**.
   * Set **Mount Path** to: `/app/data`
5. Railway will automatically build and provide a public URL (e.g. `https://your-finance.up.railway.app`).

### Deploying on Render
1. Go to **[render.com](https://render.com)** and create an account.
2. Click **"New +"** → **"Web Service"**.
3. Connect your GitHub repository.
4. Select **Environment:** `Docker`.
5. Under **Disks / Persistent Storage**, click **"Add Disk"**:
   * **Name:** `finance-data`
   * **Mount Path:** `/app/data`
   * **Size:** 1 GB
6. Click **"Create Web Service"**.

---

## Option 3: Direct VPS Deployment (Ubuntu / Debian Linux)

If you have a Linux virtual server (DigitalOcean, Hetzner, Linode, AWS EC2, etc.):

### Step 1: Install Node.js 22 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
```

### Step 2: Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

### Step 3: Build the application on the server
```bash
cd /path/to/finance
npm ci
npm run build
```

### Step 4: Start with PM2 (Auto-restarts if server reboots)
```bash
pm2 start npm --name "miakhil-finance" -- run start -- -p 3000
pm2 save
pm2 startup
```

### Step 5: (Optional) Set up Nginx & Free SSL Domain
If you want to access via `https://finance.yourfamilydomain.com`:

1. Install Nginx and Certbot:
   ```bash
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   ```

2. Create `/etc/nginx/sites-available/finance`:
   ```nginx
   server {
       server_name finance.yourfamilydomain.com;

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

3. Enable and activate SSL:
   ```bash
   sudo ln -s /etc/nginx/sites-available/finance /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d finance.yourfamilydomain.com
   ```

---

## Option 4: Run on Local PC for Household WiFi Access

If you want to run this application on your desktop/laptop and access it from any phone or tablet on your home WiFi:

1. Open a terminal in the `finance` folder.
2. Build the production package:
   ```bash
   npm run build
   ```
3. Start production server accessible to your local network:
   ```bash
   npx next start -H 0.0.0.0 -p 3000
   ```
4. Find your computer's local IP address (e.g. `192.168.1.15` via `ipconfig` on Windows).
5. Open your mobile browser on your phone connected to the same WiFi and visit:
   ```text
   http://192.168.1.15:3000
   ```
   Log in with `miakhilfamily` / `SMH07+++`.

---

## 🔄 Updating in the Future
When you update the code:
* **Docker:** Run `docker compose down && docker compose up -d --build`
* **PM2 VPS:** Run `git pull && npm run build && pm2 restart miakhil-finance`

All your saved data in `./data/finance.db` will remain safe and intact.
