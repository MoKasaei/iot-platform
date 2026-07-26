#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_URL="https://github.com/MoKasaei/iot-platform.git"
DEFAULT_INSTALL_DIR="/home/iot-platform"

info() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }
prompt() {
  local message="$1" default_value="${2:-}" answer
  if [[ -n "$default_value" ]]; then
    read -r -p "$message [$default_value]: " answer
    printf '%s' "${answer:-$default_value}"
  else
    read -r -p "$message: " answer
    printf '%s' "$answer"
  fi
}
prompt_secret() {
  local message="$1" answer
  read -r -s -p "$message: " answer
  printf '\n' >&2
  printf '%s' "$answer"
}
yes_no() {
  local message="$1" default_value="${2:-n}" answer
  read -r -p "$message [y/N]: " answer
  answer="${answer:-$default_value}"
  [[ "$answer" =~ ^[Yy]$ ]]
}
escape_env() {
  printf '%s' "$1" | tr -d '\r\n'
}

[[ "$(id -u)" -eq 0 ]] || fail "Run this installer as root (sudo bash deploy/install.sh)."
[[ -r /etc/os-release ]] || fail "This installer requires Ubuntu."
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || fail "Supported operating systems: Ubuntu 22.04 and 24.04."
[[ "${VERSION_ID:-}" == "22.04" || "${VERSION_ID:-}" == "24.04" ]] ||
  fail "Supported operating systems: Ubuntu 22.04 and 24.04."

architecture="$(dpkg --print-architecture)"
[[ "$architecture" == "amd64" || "$architecture" == "arm64" ]] ||
  fail "Unsupported architecture: $architecture"
memory_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
disk_mb="$(df -Pm / | awk 'NR==2 {print $4}')"
[[ "$memory_mb" -ge 1800 ]] || fail "At least 2 GB RAM is required."
[[ "$disk_mb" -ge 10240 ]] || fail "At least 10 GB free disk space is required."

info "IoT Platform installation wizard"
printf 'Detected: %s, %s, %s MB RAM, %s MB free disk\n' \
  "$PRETTY_NAME" "$architecture" "$memory_mb" "$disk_mb"

install_dir="$(prompt "Installation directory" "$DEFAULT_INSTALL_DIR")"
server_name="$(prompt "Domain name or public IP" "_")"
admin_email="$(prompt "Primary administrator email" "admin@example.com")"
admin_name="$(prompt "Primary administrator name" "Platform Administrator")"
organization_id="ORG_INTERNAL_${RANDOM}${RANDOM}"
organization_code="$(prompt "Organization code" "ORG001")"
organization_name="$(prompt "Organization name" "Default Organization")"
organization_logo_path="$(prompt "Organization logo file path (optional)" "")"

admin_password="$(prompt_secret "Primary administrator password (minimum 12 characters)")"
[[ "${#admin_password}" -ge 12 ]] || fail "Administrator password must contain at least 12 characters."

organization_logo=""
if [[ -n "$organization_logo_path" ]]; then
  [[ -f "$organization_logo_path" ]] || fail "Logo file was not found."
  logo_bytes="$(stat -c%s "$organization_logo_path")"
  [[ "$logo_bytes" -le 250000 ]] || fail "Logo must be smaller than 250 KB."
  case "${organization_logo_path,,}" in
    *.png) logo_mime="image/png" ;;
    *.jpg|*.jpeg) logo_mime="image/jpeg" ;;
    *.webp) logo_mime="image/webp" ;;
    *.svg) logo_mime="image/svg+xml" ;;
    *) fail "Logo must be PNG, JPEG, WebP, or SVG." ;;
  esac
  organization_logo="data:${logo_mime};base64,$(base64 -w0 "$organization_logo_path")"
fi

info "Installing operating-system packages"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl gnupg git nginx ufw openssl
jwt_secret="$(openssl rand -hex 48)"
mqtt_password="$(openssl rand -hex 32)"

info "Installing Node.js 22"
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
  gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main\n' \
  > /etc/apt/sources.list.d/nodesource.list

info "Installing MongoDB 8"
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc |
  gpg --dearmor --yes -o /etc/apt/keyrings/mongodb-server-8.0.gpg
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu %s/mongodb-org/8.0 multiverse\n' \
  "$architecture" "$VERSION_CODENAME" > /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs mongodb-org
systemctl enable --now mongod nginx
npm install --global pm2

info "Downloading the application"
if [[ -d "$install_dir/.git" ]]; then
  git -C "$install_dir" pull --ff-only
elif [[ -e "$install_dir" && -n "$(find "$install_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  fail "$install_dir exists and is not an empty Git repository."
else
  mkdir -p "$(dirname "$install_dir")"
  git clone "$REPOSITORY_URL" "$install_dir"
fi

cat > "$install_dir/backend/.env" <<EOF
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/iot-platform
JWT_SECRET=$(escape_env "$jwt_secret")
ADMIN_EMAIL=$(escape_env "$admin_email")
ADMIN_PASSWORD=$(escape_env "$admin_password")
ADMIN_NAME=$(escape_env "$admin_name")
ADMIN_ORGANIZATION_ID=$(escape_env "$organization_id")
ORGANIZATION_NAME=$(escape_env "$organization_name")
ORGANIZATION_CODE=$(escape_env "$organization_code")
ORGANIZATION_LOGO=$(escape_env "$organization_logo")
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_BACKEND_USERNAME=backend
MQTT_BACKEND_PASSWORD=$(escape_env "$mqtt_password")
MQTT_CLIENT_ID=service-backend-command
EOF
chmod 600 "$install_dir/backend/.env"

cat > "$install_dir/mqtt-broker/.env" <<EOF
MQTT_HOST=0.0.0.0
MQTT_PORT=1883
BACKEND_URL=http://127.0.0.1:3000
MQTT_OFFLINE_GRACE_MS=3000
MQTT_BACKEND_USERNAME=backend
MQTT_BACKEND_PASSWORD=$(escape_env "$mqtt_password")
EOF
chmod 600 "$install_dir/mqtt-broker/.env"
printf 'VITE_API_URL=/api\n' > "$install_dir/frontend/.env"

info "Installing application dependencies and building"
for service in backend mqtt-broker frontend; do
  npm --prefix "$install_dir/$service" ci
  npm --prefix "$install_dir/$service" run build
done

install -d -m 0755 /var/www/iot-platform
cp -a "$install_dir/frontend/dist/." /var/www/iot-platform/

cat > "$install_dir/ecosystem.production.cjs" <<EOF
module.exports = { apps: [
  { name: "iot-backend", cwd: "$install_dir/backend", script: "dist/server.js",
    env: { NODE_ENV: "production" }, restart_delay: 3000, max_restarts: 10 },
  { name: "iot-mqtt-broker", cwd: "$install_dir/mqtt-broker", script: "dist/server.js",
    env: { NODE_ENV: "production" }, restart_delay: 3000, max_restarts: 10 }
] };
EOF

cat > /etc/nginx/sites-available/iot-platform <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $server_name;
    root /var/www/iot-platform;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/iot-platform /etc/nginx/sites-enabled/iot-platform
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

info "Starting application services"
pm2 delete iot-backend iot-mqtt-broker >/dev/null 2>&1 || true
pm2 start "$install_dir/ecosystem.production.cjs"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null

if yes_no "Configure UFW now? This keeps SSH and web ports open"; then
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  if yes_no "Expose plain MQTT port 1883 publicly? Use TLS for Internet devices"; then
    ufw allow 1883/tcp
  fi
  ufw --force enable
fi

if [[ "$server_name" != "_" && "$server_name" != *:* ]] &&
   yes_no "Install a Let's Encrypt HTTPS certificate for $server_name"; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$server_name"
fi

info "Installation complete"
printf 'Dashboard: http://%s\nAdmin login: %s\n' "$server_name" "$admin_email"
printf 'Check services with: pm2 status\nFollow logs with: pm2 logs\n'
