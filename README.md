# IoT Platform

An organization-scoped IoT management platform with an Express/TypeScript API,
MQTT broker, device simulator, and React dashboard.

## Development

1. Copy `backend/.env.example` to `backend/.env`.
2. Generate the secrets and set the environment values described below.
3. In `backend`, run `npm install && npm run dev`.
4. In `frontend`, run `npm install && npm run dev`.
5. Open `http://localhost:5173` and sign in with the seeded admin account.

The Vite development server proxies `/api` to `http://localhost:3000`. For a
separate production frontend host, set `VITE_API_URL` when building.

## Access levels

- **Admin:** device visibility, telemetry, user creation, role assignment, and
  account enable/disable for their own organization.
- **User:** device visibility and telemetry for their own organization.

Authorization is enforced by the API; hiding admin navigation in the frontend is
only a user-interface convenience.

## Environment and credentials

Real credentials belong only in the ignored environment files. Never put their
values in this README, an `.env.example` file, a Git remote URL, or a commit.

### Backend

Create `backend/.env` from `backend/.env.example` and configure:

- `MONGODB_URI`: the MongoDB connection string. Create a dedicated database user
  with access only to this application's database.
- `JWT_SECRET`: signs login tokens. Generate a strong value with:

  ```bash
  openssl rand -base64 64
  ```

- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: credentials for the first administrator.
  Generate the password with:

  ```bash
  openssl rand -base64 32
  ```

- `ADMIN_NAME`: display name for the initial administrator.
- `ADMIN_ORGANIZATION_ID`: organization assigned to that administrator; the
  default development organization is `ORG001`.

The admin is created only when no user with `ADMIN_EMAIL` exists. Changing
`ADMIN_PASSWORD` later does not reset an existing database account.

### MQTT broker

Create `mqtt-broker/.env` locally. `MQTT_BACKEND_USERNAME` and
`MQTT_BACKEND_PASSWORD` must exactly match the corresponding backend values.
Generate the password with:

```bash
openssl rand -base64 32
```

Also set `BACKEND_URL` to the backend URL reachable from the broker.

### Frontend

Copy `frontend/.env.example` to `frontend/.env` only when the API is hosted
separately. Set `VITE_API_URL` to the public API base URL before running the
production build. Values prefixed with `VITE_` are included in browser code, so
never store secrets in them.

After changing a production credential, update every service that uses it and
restart those services. Keep environment files readable only by the service
account (for example, `chmod 600 backend/.env mqtt-broker/.env`).
