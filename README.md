# IoT Platform

A production-ready, organization-scoped IoT platform for registering devices,
receiving MQTT telemetry, viewing current and historical readings, controlling
equipment, and managing users from a responsive web dashboard.

## Contents

- [Architecture](#architecture)
- [System requirements and sizing](#system-requirements-and-sizing)
- [Fast production installation with the wizard](#fast-production-installation-with-the-wizard)
- [Manual production installation](#manual-production-installation)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Device and MQTT integration](#device-and-mqtt-integration)
- [Capabilities](#capabilities)
- [Operations, backup, and updates](#operations-backup-and-updates)
- [Security and firewall guidance](#security-and-firewall-guidance)
- [Troubleshooting](#troubleshooting)

## Architecture

```text
ESP / simulator
      |
      | MQTT telemetry, presence, acknowledgements
      v
Aedes MQTT broker <---- authenticated HTTP callbacks ----> Express API
      ^                                                       |
      |                                                       |
      +---------------- device commands -----------------------+
                                                              |
                                                        MongoDB database
                                                              |
React dashboard <-------------- HTTPS / REST API -------------+
```

The repository contains:

| Directory | Purpose |
| --- | --- |
| `backend` | Express, TypeScript, MongoDB models, REST API, authentication, weather, and command publishing |
| `mqtt-broker` | Aedes MQTT broker, device authentication, telemetry forwarding, and presence |
| `frontend` | React, TypeScript, Vite, Leaflet maps, and Recharts dashboard |
| `device-simulator` | Virtual MQTT device for end-to-end tests |
| `deploy` | Interactive installer and Nginx configuration |

## System requirements and sizing

### Supported production system

- Ubuntu Server 22.04 or 24.04 LTS, 64-bit
- Root or sudo access
- A static IP or DNS name
- TCP 22 and 80; TCP 443 when HTTPS is configured
- TCP 1883 only when devices must reach plain MQTT directly

### Minimum

| Resource | Minimum |
| --- | --- |
| CPU | 1 vCPU |
| RAM | 2 GB |
| Free storage | 10 GB |
| Node.js | 22 LTS |
| MongoDB | 8.0 |

The installation wizard refuses systems with less than approximately 2 GB RAM
or 10 GB free storage.

### Reference server and estimated capacity

The current deployment used as the sizing reference has:

- 2 vCPUs;
- 3.8 GB RAM;
- 58 GB disk;
- Ubuntu 24.04 LTS;
- Node.js 22;
- MongoDB 8;
- seven-day telemetry retention.

Capacity depends primarily on telemetry frequency and payload size. The
following values are conservative planning estimates, not benchmark
guarantees:

| Server | Suggested starting workload |
| --- | --- |
| 1 vCPU / 2 GB / 20 GB | Up to 50 devices at one telemetry message per minute |
| 2 vCPU / 4 GB / 60 GB | Up to 250 devices at one telemetry message per minute |
| 4 vCPU / 8 GB / 120 GB | Start testing around 1,000 devices at one message per minute |

Sending every five seconds produces twelve times as many records as sending
once per minute. Perform a representative load test before committing to a
device count, and monitor MongoDB storage, API latency, broker connections,
memory, and disk I/O. Add disk space first when increasing retention.

## Fast production installation with the wizard

The interactive installer checks the server, installs Node.js, MongoDB, Nginx,
PM2 and required packages, builds the platform, configures services, and asks
the administrator for all first-run values.

### 1. Connect to a fresh server

```bash
ssh root@YOUR_SERVER_IP
```

### 2. Download the repository and run the wizard

```bash
apt-get update
apt-get install -y git
git clone https://github.com/MoKasaei/iot-platform.git /home/iot-platform
cd /home/iot-platform
bash deploy/install.sh
```

The wizard asks for:

- installation directory;
- domain name or public IP;
- primary administrator email, name, and password;
- editable organization code and display name;
- an optional PNG, JPEG, WebP, or SVG organization logo;
- optional UFW configuration and public MQTT access;
- optional Let's Encrypt HTTPS when a domain is available.

It generates the JWT and backend MQTT secrets automatically. Environment files
are created with restricted permissions. At completion, open the printed
dashboard address and sign in with the administrator details entered during
installation.

### What the wizard changes

- Installs OS packages through `apt`.
- Adds the official NodeSource Node.js 22 and MongoDB 8 repositories.
- Enables MongoDB and Nginx.
- Installs PM2 globally.
- Creates `backend/.env`, `mqtt-broker/.env`, and `frontend/.env`.
- Runs `npm ci` and production builds.
- Publishes the frontend to `/var/www/iot-platform`.
- Creates an Nginx virtual host.
- Starts the backend and MQTT broker under PM2.
- Optionally configures UFW and HTTPS.

Review `deploy/install.sh` before running it on an existing server. The firewall
step is optional so installations sharing a host with V2Ray or other services
do not lose their existing access rules.

## Manual production installation

These instructions describe the same deployment without the wizard.

### 1. Install system packages

Install:

- Node.js 22 LTS and npm;
- MongoDB 8;
- Nginx;
- Git;
- PM2: `npm install --global pm2`.

Enable the system services:

```bash
systemctl enable --now mongod
systemctl enable --now nginx
```

Confirm:

```bash
node --version
npm --version
mongod --version
nginx -v
pm2 --version
```

### 2. Clone the application

```bash
git clone https://github.com/MoKasaei/iot-platform.git /home/iot-platform
cd /home/iot-platform
```

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
chmod 600 backend/.env
```

Edit `backend/.env`. Generate strong secrets:

```bash
openssl rand -hex 48
openssl rand -hex 32
```

Use the first for `JWT_SECRET`. Use the second for
`MQTT_BACKEND_PASSWORD` in both backend and broker files.

The first backend start creates the organization and primary administrator from
the environment. `ORGANIZATION_LOGO` is optional and must be a data URL:

```text
data:image/png;base64,iVBORw0...
```

Changing seed variables later does not overwrite an existing organization or
administrator. Change those values from the dashboard after the first start.

### 4. Configure the MQTT broker

```bash
cp mqtt-broker/.env.example mqtt-broker/.env
chmod 600 mqtt-broker/.env
```

`MQTT_BACKEND_USERNAME` and `MQTT_BACKEND_PASSWORD` must exactly match the
backend values.

### 5. Configure the frontend

```bash
cp frontend/.env.example frontend/.env
```

For an Nginx deployment on the same host:

```env
VITE_API_URL=/api
```

Never place a secret in a `VITE_*` variable. Vite embeds these variables in
browser files.

### 6. Install and build

```bash
npm --prefix backend ci
npm --prefix backend run build

npm --prefix mqtt-broker ci
npm --prefix mqtt-broker run build

npm --prefix frontend ci
npm --prefix frontend run build
```

### 7. Publish the frontend

```bash
mkdir -p /var/www/iot-platform
cp -a frontend/dist/. /var/www/iot-platform/
```

Copy `deploy/nginx-iot-platform.conf` to
`/etc/nginx/sites-available/iot-platform`, replace its `server_name`, then:

```bash
ln -s /etc/nginx/sites-available/iot-platform /etc/nginx/sites-enabled/iot-platform
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

For HTTPS with a real domain:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d iot.example.com
```

### 8. Start backend services

The included `ecosystem.config.cjs` expects `/home/iot-platform`.

```bash
cd /home/iot-platform
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`, then confirm:

```bash
pm2 status
pm2 logs
curl http://127.0.0.1:3000/
```

### 9. Configure the firewall

Do not reset a firewall on a server that already hosts V2Ray, VPNs, or other
services. Add only the required rules:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
```

Only when remote devices require plain MQTT:

```bash
ufw allow 1883/tcp
```

Plain port 1883 is not encrypted. Prefer MQTT over TLS for devices connecting
over the Internet.

## Local development

### Prerequisites

- Node.js 20 or newer;
- npm;
- MongoDB;
- four terminals.

Copy environment files:

```bash
cp backend/.env.example backend/.env
cp mqtt-broker/.env.example mqtt-broker/.env
cp frontend/.env.example frontend/.env
```

Install:

```bash
npm --prefix backend ci
npm --prefix mqtt-broker ci
npm --prefix frontend ci
npm --prefix device-simulator ci
```

Start in separate terminals:

```bash
npm --prefix backend run dev
npm --prefix mqtt-broker run dev
npm --prefix frontend run dev
npm --prefix device-simulator start
```

Open `http://localhost:5173`.

The development seed includes `AHU001` with MQTT username `ahu001` and password
`test123`. Do not use these credentials in production.

## Environment variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; default `3000` |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Signs login tokens |
| `ADMIN_EMAIL` | Yes | Primary administrator login and permanent-account protection |
| `ADMIN_PASSWORD` | Yes on first run | Initial administrator password |
| `ADMIN_NAME` | No | Initial administrator name |
| `ADMIN_ORGANIZATION_ID` | No | Initial organization ID; default `ORG001` |
| `ORGANIZATION_NAME` | No | Initial organization display name |
| `ORGANIZATION_CODE` | No | Editable dashboard code; default `ORG001` |
| `ORGANIZATION_LOGO` | No | Initial organization logo data URL |
| `MQTT_URL` | No | Broker URL used by the API |
| `MQTT_BACKEND_USERNAME` | Yes | MQTT service account |
| `MQTT_BACKEND_PASSWORD` | Yes | MQTT service password |
| `MQTT_CLIENT_ID` | No | Backend publisher client ID |

### MQTT broker

| Variable | Required | Purpose |
| --- | --- | --- |
| `MQTT_HOST` | No | Listen address; default `0.0.0.0` |
| `MQTT_PORT` | No | MQTT TCP port; default `1883` |
| `BACKEND_URL` | Yes | Backend callback URL |
| `MQTT_OFFLINE_GRACE_MS` | No | Delay before marking a disconnected device offline |
| `MQTT_BACKEND_USERNAME` | Yes | Must match backend |
| `MQTT_BACKEND_PASSWORD` | Yes | Must match backend |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No | API base URL; use `/api` behind Nginx |

## Device and MQTT integration

### Enroll a device

1. Create or register a user.
2. Open **Devices** and choose **Add device**.
3. Enter the unique hardware device ID and type.
4. An administrator may assign the owner or leave it unassigned.
5. Copy the generated MQTT username and one-time password.
6. Store the credentials in the device firmware.

Device IDs are globally unique. Users do not see IDs during normal operation;
administrators can search and manage them.

### Telemetry

The broker accepts telemetry from authenticated devices and forwards it to the
backend. Numeric values are normalized to one decimal place. Current state is
merged into the device record while individual events remain available for
charts until MongoDB's retention index removes them.

Typical parameters supported by the current AHU/cooling device UI include:

- room, coil, water, tower, outdoor, and ambient temperatures;
- humidity;
- current, voltage, power, and motor speed;
- TDS and level state;
- circulation/drain pumps and system state;
- temperature setpoint and operating toggles.

Temperature setpoints are whole numbers. Other telemetry is rounded to one
decimal place.

### End-to-end simulator test

```bash
cd /home/iot-platform/device-simulator
npm ci
npm start
```

Expected path:

1. simulator logs `Device connected`;
2. broker authenticates the device;
3. broker forwards telemetry;
4. backend logs `Telemetry saved`;
5. the dashboard changes to online and charts gain points;
6. commands sent in the dashboard reach the simulator.

## Capabilities

### Accounts and access

- Public registration with signed math CAPTCHA, honeypot, and rate limiting.
- Admin and user roles.
- Users see only devices assigned to them.
- Administrators see all organization devices.
- Per-user device allowances.
- Permanently unlimited allowance for the primary environment administrator.
- User nickname for administrator recognition.
- Profile name and photo editing.
- Account-specific white, dark, spring, summer, autumn, and winter themes.
- Self-service password change using the current password.
- Administrator-issued temporary passwords for forgotten accounts.
- Protected primary administrator: it cannot be deleted, disabled, or demoted.

### Device management

- Unique device ID enrollment.
- Device type and editable display name.
- Owner assignment, reassignment, or unassigned state.
- Admin search by device ID, device name, type, owner, nickname, or email.
- Fast online/offline presence.
- MQTT credentials shown once at enrollment.
- Current state, previous telemetry, and temperature/humidity charts.
- Equipment-specific readings and controls.
- Integer temperature setpoint.
- Permanent device deletion with typed confirmation and cascading data removal.

### Location and weather

- Leaflet/OpenStreetMap location picker.
- Erbil as the default map center.
- Place, neighborhood, and postal-code search.
- Reverse-geocoded location label.
- Current outdoor temperature, humidity, and dew point for the device location.
- Data foundation for later dry-bulb and wet-bulb calculations.

### Organization administration

- Organization display name and logo.
- Editable organization code shown in the dashboard without rewriting internal record ownership.
- First-run branding from `.env`.
- User search by name, nickname, email, or role.
- User enable/disable, role, nickname, and device allowance management.
- Permanent user deletion with confirmation and cascading device data removal.

### Administrator operations overview

- Live CPU core count and utilization.
- Used and total RAM and storage with percentage gauges.
- Server uptime.
- Total, online, and error-reporting device counts.
- Active user and administrator totals.
- Responsive progress bars and gauges.
- World map automatically fitted to all device locations.
- Green device markers for normal state and red markers for reported errors or alarms.

## Operations, backup, and updates

### Logs and status

```bash
pm2 status
pm2 logs iot-backend
pm2 logs iot-mqtt-broker
systemctl status mongod
systemctl status nginx
```

### Backup

Back up both MongoDB and environment files:

```bash
mkdir -p /root/iot-backups
mongodump --uri="mongodb://127.0.0.1:27017/iot-platform" \
  --out="/root/iot-backups/mongodb-$(date +%F)"
cp backend/.env mqtt-broker/.env /root/iot-backups/
chmod 600 /root/iot-backups/*.env
```

Copy backups off the server and test restoration. Environment files contain
secrets and must be encrypted in external storage.

### Update

```bash
cd /home/iot-platform
git pull --ff-only
npm --prefix backend ci
npm --prefix backend run build
npm --prefix mqtt-broker ci
npm --prefix mqtt-broker run build
npm --prefix frontend ci
npm --prefix frontend run build
cp -a frontend/dist/. /var/www/iot-platform/
pm2 reload iot-backend iot-mqtt-broker --update-env
```

Back up MongoDB before deploying model or retention changes.

## Security and firewall guidance

- Use HTTPS for the dashboard.
- Use MQTT TLS for devices outside a trusted network.
- Keep MongoDB and the backend's internal callbacks bound behind the firewall.
- Never expose MongoDB port 27017 publicly.
- Use a dedicated least-privilege MongoDB user for hardened deployments.
- Keep `.env` files at mode `600`.
- Use long random JWT and MQTT service secrets.
- Rotate a device credential if it is copied or disclosed.
- Do not reuse the administrator password as a device or service password.
- Preserve V2Ray/VPN/firewall ports when this platform shares a server.
- Test backups and administrator access before firewall or TLS changes.

## Troubleshooting

### Dashboard loads but API calls fail

```bash
curl http://127.0.0.1:3000/
nginx -t
pm2 logs iot-backend --lines 100
```

Confirm Nginx proxies `/api/` to `127.0.0.1:3000`.

### Backend cannot connect to MongoDB

```bash
systemctl status mongod
mongosh --eval 'db.runCommand({ ping: 1 })'
```

Check `MONGODB_URI` and available disk space.

### Broker rejects the backend

Confirm `MQTT_BACKEND_USERNAME` and `MQTT_BACKEND_PASSWORD` are identical in
`backend/.env` and `mqtt-broker/.env`, then:

```bash
pm2 reload iot-backend iot-mqtt-broker --update-env
```

### Device remains offline

- Confirm its device ID and MQTT credentials.
- Confirm it can reach the broker host and port.
- Check `pm2 logs iot-mqtt-broker`.
- Confirm the backend was started before the broker.
- Check firewall and NAT rules.

### Map is blank

The browser must reach OpenStreetMap tile servers and the Open-Meteo geocoding
service. Check browser developer-console network errors and any content-blocking
proxy.

### Organization name or logo did not change after editing `.env`

Environment values seed only the first database record. Existing branding must
be changed from **Settings → Organization branding**.

### Build runs out of memory

Add swap or build on a larger machine. A 2 GB server is the minimum; 4 GB is
recommended for building and running all services together.
