import { CSSProperties, FormEvent, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Activity, Bell, Box, ChevronRight, Gauge, LayoutDashboard, LogOut,
  Droplets, MapPin, Menu, Plus, Search, Settings, ShieldCheck,
  Thermometer, Users, Wifi, WifiOff, X
} from "lucide-react";
import { divIcon, LatLngExpression } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis
} from "recharts";
import { api } from "./api";
import { useAuth } from "./auth";
import type {
  Device, DeviceCredentials, DeviceType, Role, TelemetryPoint, User,
  WeatherReading
} from "./types";

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-brand">
      <div className="brand-mark"><Activity size={24} /></div>
      <div>
        <span className="eyebrow">OPERATIONS CLOUD</span>
        <h1>Your systems.<br /><span>Perfectly in sync.</span></h1>
        <p>Monitor, understand, and control every connected device from one secure workspace.</p>
      </div>
      <div className="signal-card">
        <span className="pulse" />
        <div><strong>Platform online</strong><small>All services operational</small></div>
      </div>
    </section>
    <section className="login-panel">
      <form className="login-form" onSubmit={submit}>
        <div className="mobile-logo"><Activity /> IoT Platform</div>
        <span className="eyebrow">WELCOME BACK</span>
        <h2>Sign in to your workspace</h2>
        <p>Use the account provided by your administrator.</p>
        <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ChevronRight size={18} /></button>
      </form>
    </section>
  </main>;
}

function Shell() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (loading) return <div className="page-loader"><Activity className="spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const links = [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/devices", label: "Devices", icon: Box },
    { to: "/alerts", label: "Alerts", icon: Bell },
    ...(user.role === "admin" ? [{ to: "/users", label: "User access", icon: Users }] : []),
    { to: "/settings", label: "Settings", icon: Settings }
  ];

  return <div className="app-shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <button className="close-menu" onClick={() => setOpen(false)}><X /></button>
      <div className="logo"><span><Activity size={20} /></span> IoT Platform</div>
      <nav>{links.map(({ to, label, icon: Icon, end }) =>
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
          <Icon size={19} /> {label}
        </NavLink>)}
      </nav>
      <div className="sidebar-user">
        <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
        <div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrator" : "Operator"}</small></div>
        <button title="Sign out" onClick={logout}><LogOut size={18} /></button>
      </div>
    </aside>
    <div className="workspace">
      <header><button className="menu-button" onClick={() => setOpen(true)}><Menu /></button><div className="search"><Search size={17} /><span>Search devices…</span></div><div className="header-right"><span className="org-chip">{user.organizationId}</span><Bell size={20} /></div></header>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/devices/:deviceId" element={<DeviceDetail />} />
        <Route path="/users" element={user.role === "admin" ? <UserAccess /> : <Navigate to="/" />} />
        <Route path="/alerts" element={<Placeholder title="Alerts" text="Alarm rules and event history will appear here." />} />
        <Route path="/settings" element={<Placeholder title="Settings" text="Workspace and notification settings will appear here." />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
  </div>;
}

function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;

    async function load(showLoading: boolean) {
      if (showLoading) setLoading(true);
      try {
        const response = await api<{ devices: Device[] }>("/devices");
        if (active) {
          setDevices(response.devices);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load devices");
        }
      } finally {
        if (active && showLoading) setLoading(false);
      }
    }

    void load(true);
    const interval = window.setInterval(() => void load(false), 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [revision]);
  return {
    devices,
    loading,
    error,
    refresh: () => setRevision(value => value + 1)
  };
}

function Overview() {
  const { user } = useAuth();
  const { devices, loading, error } = useDevices();
  const online = devices.filter(d => d.online).length;
  const latest = devices.slice(0, 5);

  return <main className="content">
    <div className="page-title"><div><span className="eyebrow">LIVE OPERATIONS</span><h1>Good day, {user!.name.split(" ")[0]}</h1><p>Here’s what’s happening across your connected environment.</p></div><span className="live"><i /> Live</span></div>
    {error && <div className="error">{error}</div>}
    <section className="stat-grid">
      <Stat icon={Box} label="Total devices" value={loading ? "—" : String(devices.length)} note="In your organization" />
      <Stat icon={Wifi} label="Online now" value={loading ? "—" : String(online)} note={devices.length ? `${Math.round(online / devices.length * 100)}% availability` : "No devices"} tone="green" />
      <Stat icon={WifiOff} label="Offline" value={loading ? "—" : String(devices.length - online)} note="Needs attention" tone="orange" />
      <Stat icon={ShieldCheck} label="Open alerts" value="0" note="Everything looks clear" tone="blue" />
    </section>
    <section className="panel">
      <div className="panel-head"><div><h2>Device health</h2><p>Current state of your connected equipment</p></div><NavLink to="/devices">View all <ChevronRight size={16} /></NavLink></div>
      <div className="device-list">
        {!loading && latest.length === 0 && <Empty />}
        {latest.map(device => <DeviceRow key={device.deviceId} device={device} />)}
      </div>
    </section>
  </main>;
}

function Stat({ icon: Icon, label, value, note, tone = "" }: { icon: typeof Box; label: string; value: string; note: string; tone?: string }) {
  return <article className={`stat ${tone}`}><div className="stat-icon"><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function DeviceRow({ device }: { device: Device }) {
  const readings = getDisplayReadings(device.state || {});
  return <NavLink className="device-row" to={`/devices/${device.deviceId}`}><div className="device-icon"><Gauge /></div><div className="device-name"><strong>{device.name}</strong><small>{device.typeName || device.typeId}</small></div><span className={device.online ? "status online" : "status"}><i />{device.online ? "Online" : "Offline"}</span><div className="reading">{readings.map(reading => <span key={reading.label}><small>{reading.label}</small>{reading.value}</span>)}</div><ChevronRight className="row-arrow" /></NavLink>;
}

function Devices() {
  const { user } = useAuth();
  const { devices, loading, error, refresh } = useDevices();
  const [query, setQuery] = useState("");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const filtered = devices.filter(d => `${d.name} ${d.typeName || d.typeId}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="content">
    <div className="page-title"><div><span className="eyebrow">ASSET DIRECTORY</span><h1>Devices</h1><p>Monitor every device assigned to your organization.</p></div>{user?.role === "admin" && <button className="primary-button compact" onClick={() => setShowAddDevice(true)}><Plus size={18} /> Add device</button>}</div>
    <div className="toolbar"><div className="input-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a device" /></div></div>
    {error && <div className="error">{error}</div>}
    <section className="panel"><div className="device-list">{loading ? <div className="loading-text">Loading devices…</div> : filtered.length ? filtered.map(d => <DeviceRow key={d.deviceId} device={d} />) : <Empty />}</div></section>
    {showAddDevice && <NewDevice onClose={() => setShowAddDevice(false)} onCreated={refresh} />}
  </main>;
}

function NewDevice({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [types, setTypes] = useState<DeviceType[]>([]);
  const [form, setForm] = useState({
    name: "",
    typeId: "",
    hardware: "",
    firmwareVersion: ""
  });
  const [credentials, setCredentials] = useState<DeviceCredentials | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ types: DeviceType[] }>("/devices/types")
      .then(response => {
        setTypes(response.types);
        if (response.types[0]) {
          setForm(current => ({ ...current, typeId: response.types[0].typeId }));
        }
      })
      .catch(loadError => setError(loadError.message));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api<{
        device: Device;
        credentials: DeviceCredentials;
      }>("/devices", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setCredentials(response.credentials);
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create device");
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop">
    {credentials ? <div className="modal">
      <div className="modal-title"><div><h2>Device created</h2><p>Copy these MQTT credentials now. The password is shown only once.</p></div><button type="button" onClick={onClose}><X /></button></div>
      <div className="credential-box"><label>MQTT username<code>{credentials.username}</code></label><label>MQTT password<code>{credentials.password}</code></label></div>
      <div className="modal-actions"><button className="primary-button compact" onClick={onClose}>Done</button></div>
    </div> : <form className="modal" onSubmit={submit}>
      <div className="modal-title"><div><h2>Add a device</h2><p>Create a device and generate its MQTT credentials.</p></div><button type="button" onClick={onClose}><X /></button></div>
      <label>Device name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Lobby air handler" maxLength={120} required /></label>
      <label>Device type<select value={form.typeId} onChange={event => setForm({ ...form, typeId: event.target.value })} required>{types.map(type => <option key={type.typeId} value={type.typeId}>{type.name}</option>)}</select></label>
      <label>Hardware (optional)<input value={form.hardware} onChange={event => setForm({ ...form, hardware: event.target.value })} placeholder="ESP32" /></label>
      <label>Firmware version (optional)<input value={form.firmwareVersion} onChange={event => setForm({ ...form, firmwareVersion: event.target.value })} placeholder="1.0.0" /></label>
      {error && <div className="error">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact" disabled={busy || !form.typeId}>{busy ? "Creating..." : "Create device"}</button></div>
    </form>}
  </div>;
}

const deviceMarker = divIcon({
  className: "device-map-marker",
  html: "<span></span>",
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function MapClick({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

function numberFrom(data: Record<string, unknown>, key: string): number | null {
  const entry = Object.entries(data).find(([name]) => name.toLowerCase() === key.toLowerCase());
  const value = Number(entry?.[1]);
  return Number.isFinite(value) ? value : null;
}

function numberFromAny(data: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = numberFrom(data, key);
    if (value !== null) return value;
  }
  return null;
}

function getDisplayReadings(data: Record<string, unknown>) {
  const temperature = numberFromAny(data, "RoomTemp", "temperature");
  const humidity = numberFromAny(data, "Humidity", "humidity");
  return [
    ...(temperature !== null ? [{ label: "Temperature", value: `${fixed(temperature)} °C` }] : []),
    ...(humidity !== null ? [{ label: "Humidity", value: `${fixed(humidity)}%` }] : [])
  ].slice(0, 2);
}

function MotorSpeedGauge({ value }: { value: number | null }) {
  const speed = value === null ? 0 : Math.max(0, Math.min(100, value));
  return <article className="stat motor-stat">
    <span>Motor speed</span>
    <div className="motor-gauge" style={{ "--motor-speed": `${speed * 3.6}deg` } as CSSProperties}>
      <div><strong>{value === null ? "—" : fixed(value, 0)}</strong><small>{value === null ? "" : "%"}</small></div>
    </div>
    <small>Current drive output</small>
  </article>;
}

const sensorDefinitions = [
  { key: "Watt", label: "Power", unit: "W" },
  { key: "Current", label: "Current", unit: "A" },
  { key: "CoilTemp", label: "Coil temperature", unit: "°C" },
  { key: "DriveTemp", label: "Drive temperature", unit: "°C" },
  { key: "RadiatorTemp", label: "Radiator temperature", unit: "°C" },
  { key: "FanIntakeTemp", label: "Fan intake", unit: "°C" },
  { key: "WaterTankTemp", label: "Water tank", unit: "°C" },
  { key: "TowerInletTemp", label: "Tower inlet", unit: "°C" },
  { key: "TowerOutletTemp", label: "Tower outlet", unit: "°C" },
  { key: "TDS", label: "Water quality", unit: "ppm" }
];

const statusDefinitions = [
  { key: "LevelSwitch", label: "Level switch" },
  { key: "CircularPump", label: "Circulation pump" },
  { key: "DrainPump", label: "Drain pump" },
  { key: "SystemONOFF", label: "System" },
  { key: "TurboONOFF", label: "Turbo" },
  { key: "Errors", label: "Errors" }
];

function EquipmentReadings({ state }: { state: Record<string, unknown> }) {
  const sensors = sensorDefinitions
    .map(definition => ({ ...definition, value: numberFrom(state, definition.key) }))
    .filter(sensor => sensor.value !== null);
  const statuses = statusDefinitions
    .filter(definition => state[definition.key] !== undefined)
    .map(definition => ({
      ...definition,
      active: !["0", "false", "off", ""].includes(String(state[definition.key]).toLowerCase())
    }));

  if (!sensors.length && !statuses.length) return null;

  return <section className="panel equipment-panel">
    <div className="panel-head"><div><h2>Equipment readings</h2></div></div>
    <div className="equipment-grid">
      {sensors.map(sensor => <article className="equipment-reading" key={sensor.key}><span>{sensor.label}</span><strong>{fixed(sensor.value)} <small>{sensor.unit}</small></strong></article>)}
      {statuses.map(status => <article className="equipment-status" key={status.key}><i className={status.active ? "active" : ""} /><span>{status.label}</span><strong>{status.active ? "On" : "Off"}</strong></article>)}
    </div>
  </section>;
}

function hasCoordinates(location: Device["location"]): location is NonNullable<Device["location"]> {
  return Boolean(
    location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

function fixed(value: unknown, digits = 1): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function DeviceDetail() {
  const { deviceId = "" } = useParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [weather, setWeather] = useState<WeatherReading | null>(null);
  const [location, setLocation] = useState({ latitude: 35.6892, longitude: 51.389, label: "" });
  const [nameDraft, setNameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadWeather() {
    try {
      const response = await api<{ weather: WeatherReading }>(`/devices/${deviceId}/weather`);
      setWeather(response.weather);
    } catch (weatherError) {
      setWeather(null);
      if (weatherError instanceof Error && !weatherError.message.includes("Set the device location")) {
        setError(weatherError.message);
      }
    }
  }

  useEffect(() => {
    setError("");
    Promise.all([
      api<{ device: Device }>(`/devices/${deviceId}`),
      api<{ telemetry: TelemetryPoint[] }>(`/devices/${deviceId}/telemetry?limit=100`)
    ])
      .then(([deviceResponse, telemetryResponse]) => {
        setDevice(deviceResponse.device);
        setNameDraft(deviceResponse.device.name);
        setTelemetry(telemetryResponse.telemetry);
        if (hasCoordinates(deviceResponse.device.location)) {
          setLocation({
            ...deviceResponse.device.location,
            label: deviceResponse.device.location.label || ""
          });
          void loadWeather();
        }
      })
      .catch(loadError => setError(loadError.message));
  }, [deviceId]);

  async function saveLocation() {
    setSaving(true);
    setError("");
    try {
      const response = await api<{ device: Device }>(`/devices/${deviceId}/location`, {
        method: "PATCH",
        body: JSON.stringify(location)
      });
      setDevice(response.device);
      await loadWeather();
      setShowLocation(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save location");
    } finally {
      setSaving(false);
    }
  }

  async function saveName() {
    const name = nameDraft.trim();
    if (!name || name === device?.name) return;
    setRenaming(true);
    setError("");
    try {
      const response = await api<{ device: Device }>(`/devices/${deviceId}`, {
        method: "PATCH",
        body: JSON.stringify({ name })
      });
      setDevice(current => current ? { ...current, name: response.device.name } : current);
      setNameDraft(response.device.name);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Could not rename device");
    } finally {
      setRenaming(false);
    }
  }

  if (!device) {
    return <main className="content"><div className="loading-text">Loading device history...</div>{error && <div className="error">{error}</div>}</main>;
  }

  const chartData = telemetry.map(point => ({
    time: new Date(point.timestamp).toLocaleString([], {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    }),
    temperature: numberFromAny(point.data, "RoomTemp", "temperature"),
    humidity: numberFromAny(point.data, "Humidity", "humidity")
  }));
  const mapCenter: LatLngExpression = [location.latitude, location.longitude];

  return <main className="content">
    <div className="page-title">
      <div><span className="eyebrow">DEVICE INSIGHT</span><div className="device-title-edit"><input value={nameDraft} onChange={event => setNameDraft(event.target.value)} maxLength={120} aria-label="Device name" /><button className="text-button" disabled={renaming || !nameDraft.trim() || nameDraft.trim() === device.name} onClick={saveName}>{renaming ? "Saving..." : "Save name"}</button></div><p>{device.typeName || device.typeId}</p></div>
      <div className="page-actions"><button className="secondary-button" onClick={() => setShowLocation(true)}><MapPin size={16} /> {hasCoordinates(device.location) ? "Change location" : "Set location"}</button><NavLink className="secondary-link" to="/devices">Back to devices</NavLink></div>
    </div>
    {error && <div className="error">{error}</div>}

    <section className="device-metrics">
      <Stat icon={Thermometer} label="Device temperature" value={`${fixed(numberFromAny(device.state || {}, "RoomTemp", "temperature"))} °C`} note="Latest device reading" tone="orange" />
      <Stat icon={Droplets} label="Device humidity" value={`${fixed(numberFromAny(device.state || {}, "Humidity", "humidity"))}%`} note="Latest device reading" tone="blue" />
      <MotorSpeedGauge value={numberFromAny(device.state || {}, "MotorSpeed")} />
      <Stat icon={Thermometer} label="Outdoor temperature" value={weather ? `${fixed(weather.temperature)} °C` : "—"} note={hasCoordinates(device.location) ? "Current outdoor reading" : "Set device location"} tone="green" />
    </section>

    <EquipmentReadings state={device.state || {}} />

    <section className="panel chart-panel">
      <div className="panel-head"><div><h2>Temperature and humidity history</h2><p>Previous device telemetry, oldest to newest</p></div></div>
      {chartData.length ? <div className="telemetry-chart"><ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7edf3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={38} />
          <YAxis yAxisId="temp" tick={{ fontSize: 11 }} unit="°" />
          <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip /><Legend />
          <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temperature °C" stroke="#e67e32" strokeWidth={2} dot={false} connectNulls />
          <Line yAxisId="humidity" type="monotone" dataKey="humidity" name="Humidity %" stroke="#168fb5" strokeWidth={2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer></div> : <Empty />}
    </section>

    <section className="panel weather-panel">
      <div className="panel-head"><div><h2>Outdoor conditions</h2></div></div>
      {weather ? <div className="weather-widget-grid">
        <article className="weather-widget orange"><Thermometer /><span>Outdoor temperature</span><strong>{fixed(weather.temperature)} °C</strong></article>
        <article className="weather-widget blue"><Droplets /><span>Outdoor humidity</span><strong>{weather.relativeHumidity}%</strong></article>
        <article className="weather-widget"><Activity /><span>Dew point</span><strong>{fixed(weather.dewPoint)} °C</strong></article>
      </div> : <div className="empty weather-empty"><MapPin /><strong>No outdoor conditions yet</strong><button className="primary-button compact" onClick={() => setShowLocation(true)}>Set location</button></div>}
    </section>

    {showLocation && <div className="modal-backdrop"><div className="modal location-modal">
      <div className="modal-title"><div><h2>Device location</h2><p>Click the map to place this device.</p></div><button type="button" onClick={() => setShowLocation(false)}><X /></button></div>
      <MapContainer key={`${location.latitude}-${location.longitude}`} center={mapCenter} zoom={12} scrollWheelZoom className="device-map">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClick onSelect={(latitude, longitude) => setLocation(current => ({ ...current, latitude, longitude }))} />
        <Marker position={mapCenter} icon={deviceMarker} />
      </MapContainer>
      <div className="location-form">
        <label>Location label<input value={location.label} onChange={event => setLocation({ ...location, label: event.target.value })} placeholder="Roof plant room" /></label>
        <div className="coordinates"><span>{fixed(location.latitude, 5)}</span><span>{fixed(location.longitude, 5)}</span></div>
        <button className="primary-button compact" disabled={saving} onClick={saveLocation}>{saving ? "Saving..." : "Save location"}</button>
      </div>
    </div></div>}
  </main>;
}

function UserAccess() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const load = () => api<{ users: User[] }>("/users").then(r => setUsers(r.users)).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function toggle(user: User) {
    try {
      await api(`/users/${user.userId}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
  }

  return <main className="content">
    <div className="page-title"><div><span className="eyebrow">ADMINISTRATION</span><h1>User access</h1><p>Control who can access this organization and what they can do.</p></div><button className="primary-button compact" onClick={() => setShowForm(true)}><Plus size={18} /> Add user</button></div>
    {error && <div className="error">{error}</div>}
    <section className="panel user-table">
      <div className="table-head"><span>User</span><span>Role</span><span>Status</span><span>Action</span></div>
      {users.map(user => <div className="table-row" key={user.userId}><div className="user-cell"><span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}{user.primaryAdmin ? " · Primary admin" : ""}</small></div></div><span className="role"><ShieldCheck size={15} /> {user.role}</span><span className={user.active ? "status online" : "status"}><i />{user.active ? "Active" : "Disabled"}</span><button className="text-button" disabled={user.primaryAdmin} title={user.primaryAdmin ? "The primary administrator cannot be disabled" : undefined} onClick={() => toggle(user)}>{user.primaryAdmin ? "Protected" : user.active ? "Disable" : "Enable"}</button></div>)}
    </section>
    {showForm && <NewUser onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
  </main>;
}

function NewUser({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" as Role });
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/users", { method: "POST", body: JSON.stringify(form) });
      onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create user"); }
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-title"><div><h2>Add a user</h2><p>Create an account in your organization.</p></div><button type="button" onClick={onClose}><X /></button></div>
    <label>Full name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
    <label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label>
    <label>Temporary password<input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
    <label>Access level<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}><option value="user">User — monitor and control devices</option><option value="admin">Admin — manage users and organization</option></select></label>
    {error && <div className="error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact">Create user</button></div>
  </form></div>;
}

function Empty() {
  return <div className="empty"><Box /><strong>No devices found</strong><span>Devices assigned to this organization will appear here.</span></div>;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return <main className="content"><div className="page-title"><div><h1>{title}</h1><p>{text}</p></div></div><section className="panel empty"><Settings /><strong>Coming next</strong><span>This area is ready for the next implementation phase.</span></section></main>;
}

export default function App() {
  return <Routes><Route path="/login" element={<Login />} /><Route path="/*" element={<Shell />} /></Routes>;
}
