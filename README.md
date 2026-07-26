# IoT Platform

An organization-scoped IoT management platform with:

- an Express and TypeScript REST API;
- MongoDB for users, devices, commands, and telemetry;
- an Aedes MQTT broker with backend and device authentication;
- a React/Vite operations dashboard; and
- a Node.js device simulator for end-to-end testing.

## How the services communicate

```text
Device simulator <-- MQTT --> MQTT broker <-- HTTP callbacks --> Backend <-- HTTP --> Frontend
                                         \                  /
                                          ---- MongoDB ----
```

The backend publishes device commands to MQTT. Devices publish telemetry and
command acknowledgements to the broker. The broker authenticates devices through
the backend, then forwards device events to the backend's internal HTTP routes.

## Prerequisites

- Node.js 20 LTS or newer
- npm
- MongoDB running locally, or a MongoDB connection string
- four terminal windows for the backend, broker, frontend, and simulator

## Quick start

### 1. Configure the backend

From the repository root:

```bash
cp backend/.env.example backend/.env
```

On PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env`. At minimum, replace `JWT_SECRET`,
`MQTT_BACKEND_PASSWORD`, and `ADMIN_PASSWORD`. The MQTT username and password
are service credentials shared only by the backend and broker.

### 2. Configure the MQTT broker

```bash
cp mqtt-broker/.env.example mqtt-broker/.env
```

On PowerShell:

```powershell
Copy-Item mqtt-broker/.env.example mqtt-broker/.env
```

Set `MQTT_BACKEND_USERNAME` and `MQTT_BACKEND_PASSWORD` to exactly the same
values used in `backend/.env`.

### 3. Install dependencies

Run these once:

```bash
cd backend
npm ci

cd ../mqtt-broker
npm ci

cd ../frontend
npm ci

cd ../device-simulator
npm ci
```

### 4. Start the services

Start them in this order, using a separate terminal for each service:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd mqtt-broker
npm run dev
```

```bash
# Terminal 3
cd frontend
npm run dev
```

```bash
# Terminal 4 (optional end-to-end test)
cd device-simulator
npm start
```

Open `http://localhost:5173` and sign in with `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from `backend/.env`.

The first backend startup seeds organization `ORG001`, an administrator, and
test device `AHU001`. The simulator uses the seeded device credentials
`ahu001` / `test123`. These defaults are for local development only.

## Confirm that MQTT is working

With all four services running:

1. The broker should log `MQTT backend authenticated`.
2. The simulator should log `Device connected`.
3. The broker should log `Forwarding telemetry`.
4. The backend should log `Telemetry saved`.
5. Device `AHU001` should appear online in the frontend after refresh.

If the backend logs `MQTT publisher error` or the broker rejects the backend,
confirm that the two `MQTT_BACKEND_*` values match. If device authentication
fails, start the backend first and confirm MongoDB is available so the seeded
device exists.

## Environment variables

### Backend: `backend/.env`

| Variable | Purpose | Development default |
| --- | --- | --- |
| `PORT` | REST API port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/iot-platform` |
| `JWT_SECRET` | Signs login tokens | Required |
| `ADMIN_EMAIL` | Seed administrator login | `admin@example.com` |
| `ADMIN_PASSWORD` | Seed administrator password | Required |
| `ADMIN_NAME` | Seed administrator name | `Platform Administrator` |
| `ADMIN_ORGANIZATION_ID` | Seed administrator organization | `ORG001` |
| `MQTT_URL` | Broker URL used by the backend publisher | `mqtt://127.0.0.1:1883` |
| `MQTT_BACKEND_USERNAME` | Backend MQTT service user | Required |
| `MQTT_BACKEND_PASSWORD` | Backend MQTT service password | Required |
| `MQTT_CLIENT_ID` | Backend MQTT client ID | `service-backend-command` |

### Broker: `mqtt-broker/.env`

| Variable | Purpose | Development default |
| --- | --- | --- |
| `MQTT_HOST` | Address on which the broker listens | `0.0.0.0` |
| `MQTT_PORT` | MQTT TCP port | `1883` |
| `BACKEND_URL` | Backend URL reachable from the broker | `http://127.0.0.1:3000` |
| `MQTT_BACKEND_USERNAME` | Must match the backend value | Required |
| `MQTT_BACKEND_PASSWORD` | Must match the backend value | Required |

### Frontend: `frontend/.env`

For local development, no frontend environment file is required because Vite
proxies `/api` to `http://localhost:3000`. If the API is hosted separately,
copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

Never put a secret in a `VITE_*` variable; Vite includes those values in browser
code.

## Frontend template direction

The current frontend already uses the appropriate Node.js toolchain:
React, TypeScript, Vite, and npm. Node.js itself is the build/runtime tool, not
the visual template.

For the next UI iteration, the recommended free base is
[CoreUI Free React Admin Template](https://github.com/coreui/coreui-free-react-admin-template).
It is MIT licensed, Vite based, and provides the dashboard layout, navigation,
forms, tables, and responsive components this platform needs. Keep the existing
API and authentication modules, then migrate views incrementally rather than
replacing the working frontend in one large change.

## Production notes

- Use a dedicated, least-privilege MongoDB user.
- Use long random values for JWT and MQTT service secrets.
- Do not expose port `1883` publicly without TLS. Use `mqtts://` and certificate
  validation for devices outside a trusted network.
- Protect broker-to-backend internal routes at the network layer before
  production deployment.
- Build each TypeScript service with `npm run build`, then start it with
  `npm start`.
- The admin seed runs only when `ADMIN_EMAIL` does not already exist. Changing
  `ADMIN_PASSWORD` later does not reset the stored account.

### PM2 and Nginx

The repository includes `ecosystem.config.cjs` for running the backend and MQTT
broker with PM2, and `deploy/nginx-iot-platform.conf` for serving the frontend
and proxying `/api` to the backend.

```bash
cd /home/iot-platform
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Copy `frontend/dist` to `/var/www/iot-platform`, install the Nginx configuration
in `/etc/nginx/sites-available/iot-platform`, enable it, validate with
`nginx -t`, and reload Nginx.
