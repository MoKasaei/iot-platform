import { FormEvent, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Activity, Bell, Box, ChevronRight, Clock, Cpu, Gauge, HardDrive, LayoutDashboard, LogOut,
  Droplets, MapPin, Menu, Plus, Search, Settings, ShieldCheck,
  Thermometer, Trash2, Upload, Users, Wifi, WifiOff, X
} from "lucide-react";
import { divIcon, LatLngExpression } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis
} from "recharts";
import { api } from "./api";
import { useAuth } from "./auth";
import type {
  Alarm, Device, DeviceCredentials, DeviceType, Organization, Role, TelemetryPoint, Theme, User,
  WeatherReading
} from "./types";

function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [organizationName, setOrganizationName] = useState("your organization");
  useEffect(() => {
    api<{ organization: Organization }>("/organizations/public")
      .then(response => setOrganizationName(response.organization.name))
      .catch(() => undefined);
  }, []);

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
        <p>Sign in, or create your own account.</p>
        <label>Email address or phone number<input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com or +964…" autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required /></label>
        <p className="forgot-note">Forgot your password? Contact the administrator of {organizationName} to receive a temporary password.</p>
        {error && <div className="error">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? "Signing in…" : "Sign in"} <ChevronRight size={18} /></button>
        <NavLink className="text-button auth-link" to="/register">Create an account</NavLink>
      </form>
    </section>
  </main>;
}

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", captchaAnswer: "", website: "" });
  const [challenge, setChallenge] = useState({ question: "", token: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshCaptcha = () => api<{ question: string; token: string }>("/auth/captcha")
    .then(({ question, token }) => setChallenge({ question, token }))
    .catch(e => setError(e.message));
  useEffect(() => { refreshCaptcha(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Enter an email address or phone number"); setBusy(false); return;
    }
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify({ ...form, captchaToken: challenge.token }) });
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
      refreshCaptcha();
    } finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-brand"><div className="brand-mark"><Activity /></div><div><span className="eyebrow">JOIN THE PLATFORM</span><h1>Connect your first device.</h1><p>Create a secure account and start with one device. An administrator can raise this limit later.</p></div></section><section className="login-panel"><form className="login-form" onSubmit={submit}><span className="eyebrow">NEW ACCOUNT</span><h2>Create your account</h2>
    <label>Full name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={120} required /></label>
    <label>Email address (optional)<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
    <label>Phone number (optional)<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+964…" /></label>
    <label>Password<input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
    <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></label>
    <label>Security check: {challenge.question}<input inputMode="numeric" value={form.captchaAnswer} onChange={e => setForm({ ...form, captchaAnswer: e.target.value })} required /></label>
    {error && <div className="error">{error}</div>}<button className="primary-button" disabled={busy || !challenge.token}>{busy ? "Creating account…" : "Create account"}</button><NavLink className="text-button auth-link" to="/login">Back to sign in</NavLink>
  </form></section></main>;
}

function useAlarms(enabled = true) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const load = () => api<{ alarms: Alarm[]; unreadCount: number }>("/alarms")
    .then(response => { setAlarms(response.alarms); setUnreadCount(response.unreadCount); setError(""); })
    .catch(loadError => setError(loadError.message));
  useEffect(() => {
    if (!enabled) { setAlarms([]); setUnreadCount(0); return; }
    void load();
    const interval = window.setInterval(load, 5000);
    return () => window.clearInterval(interval);
  }, [enabled]);
  async function read(alarmId: string) {
    await api(`/alarms/${alarmId}/read`, { method: "PATCH" }); await load();
  }
  async function dismiss(alarmId: string) {
    await api(`/alarms/${alarmId}`, { method: "DELETE" }); await load();
  }
  async function dismissAll() {
    await api("/alarms", { method: "DELETE" }); await load();
  }
  return { alarms, unreadCount, error, read, dismiss, dismissAll, refresh: load };
}

function Shell() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const alarmFeed = useAlarms(!(user?.role === "admin" && user.muteAlarmNotifications));
  useEffect(() => {
    if (user) api<{ organization: Organization }>("/organizations/current")
      .then(response => setOrganization(response.organization))
      .catch(() => undefined);
  }, [user?.organizationId]);
  useEffect(() => {
    if (!showNotifications) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.(".notification-wrap")) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [showNotifications]);
  if (loading) return <div className="page-loader"><Activity className="spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const links = [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/devices", label: "Devices", icon: Box },
    { to: "/alerts", label: "Alerts", icon: Bell },
    ...(user.role === "admin" ? [{ to: "/users", label: "User access", icon: Users }] : []),
    { to: "/settings", label: "Settings", icon: Settings }
  ];

  return <div className={`app-shell theme-${user.theme || "default"}`}>
    <aside className={open ? "sidebar open" : "sidebar"}>
      <button className="close-menu" onClick={() => setOpen(false)}><X /></button>
      <div className="logo"><span>{organization?.logo ? <img src={organization.logo} alt="" /> : <Activity size={20} />}</span> {organization?.name || "IoT Platform"}</div>
      <nav>{links.map(({ to, label, icon: Icon, end }) =>
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
          <Icon size={19} /> {label}
        </NavLink>)}
      </nav>
      <div className="sidebar-user">
        <span className="avatar">{user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : user.name.slice(0, 2).toUpperCase()}</span>
        <div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrator" : "Operator"}</small></div>
        <button title="Sign out" onClick={logout}><LogOut size={18} /></button>
      </div>
    </aside>
    <div className="workspace">
      <header><button className="menu-button" onClick={() => setOpen(true)}><Menu /></button><div className="header-right"><span className="org-chip">{organization?.code || user.organizationId}</span><div className="notification-wrap"><button className="notification-button" onClick={() => setShowNotifications(value => !value)} aria-label="Notifications"><Bell size={20} />{alarmFeed.unreadCount > 0 && <b>{Math.min(alarmFeed.unreadCount, 99)}</b>}</button>{showNotifications && <div className="notification-panel"><div className="notification-head"><div><strong>Alarms</strong><small>{alarmFeed.unreadCount} unread</small></div><NavLink to="/alerts" onClick={() => setShowNotifications(false)}>View all</NavLink></div><div className="notification-list">{alarmFeed.alarms.slice(0, 6).map(alarm => <article className={`${alarm.read ? "" : "unread"} ${alarm.resolvedAt ? "resolved" : ""}`} key={alarm._id}><span className="alarm-dot" /><div><strong>{alarm.deviceName}</strong><p>{alarm.message}</p>{user.role === "admin" && <small className="alarm-owner">Owner: {alarm.owner ? alarm.owner.nickname ? `${alarm.owner.nickname} · ${alarm.owner.name}` : alarm.owner.name : "Unassigned"}</small>}<small>{new Date(alarm.createdAt).toLocaleString()}</small></div><div className="notification-actions">{!alarm.read && <button title="Mark as read" onClick={() => void alarmFeed.read(alarm._id)}>Read</button>}<button title="Dismiss" onClick={() => void alarmFeed.dismiss(alarm._id)}><X size={14} /></button></div></article>)}{alarmFeed.alarms.length === 0 && <div className="notification-empty">{user.role === "admin" && user.muteAlarmNotifications ? "Notifications muted" : "No alarms"}</div>}</div></div>}</div></div></header>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/devices/:deviceId" element={<DeviceDetail />} />
        <Route path="/users" element={user.role === "admin" ? <UserAccess /> : <Navigate to="/" />} />
        <Route path="/alerts" element={<AlarmCenter />} />
        <Route path="/settings" element={<ProfileSettings />} />
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

interface OverviewData {
  system: {
    cpu: { cores: number; usagePercent: number };
    ram: { totalBytes: number; usedBytes: number };
    storage: { totalBytes: number; usedBytes: number };
    uptimeSeconds: number;
  };
  totals: {
    devices: number; onlineDevices: number; errorDevices: number;
    users: number; administrators: number;
  };
  devices: Array<{
    deviceId: string; name: string; typeId: string; online: boolean; error: boolean;
    latitude: number; longitude: number; label?: string; errors: string[];
    owner?: { userId: string; name: string; nickname?: string };
  }>;
}

function percent(used: number, total: number) {
  return total > 0 ? Math.round(used / total * 100) : 0;
}

function gigabytes(bytes: number) {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function uptimeLabel(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function MetricGauge({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Cpu }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <article className="system-metric"><div className="metric-heading"><Icon size={18} /><span>{label}</span></div><div className="ring-gauge" style={{ background: `conic-gradient(var(--theme-accent) ${bounded}%, var(--ring-track, #e5ebf1) ${bounded}% 100%)` }}><div><strong>{bounded}%</strong></div></div><small>{detail}</small></article>;
}

function FitDeviceBounds({ devices, trigger }: { devices: OverviewData["devices"]; trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (devices.length === 1) {
      map.setView([devices[0].latitude, devices[0].longitude], 11);
    } else if (devices.length > 1) {
      map.fitBounds(devices.map(device => [device.latitude, device.longitude] as [number, number]), { padding: [35, 35] });
    }
  }, [trigger, map]);
  return null;
}

function AdminOverview({ name }: { name: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  const [mapRecenter, setMapRecenter] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => api<OverviewData>("/overview")
      .then(response => { if (active) { setData(response); setError(""); } })
      .catch(loadError => { if (active) setError(loadError.message); });
    void load();
    const interval = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  const marker = (hasError: boolean) => divIcon({
    className: "overview-map-marker",
    html: `<span class="${hasError ? "error" : ""}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  const onlinePercent = data?.totals.devices ? Math.round(data.totals.onlineDevices / data.totals.devices * 100) : 0;
  return <main className="content"><div className="page-title"><div><span className="eyebrow">SYSTEM OPERATIONS</span><h1>Good day, {name.split(" ")[0]}</h1><p>Live infrastructure and organization overview.</p></div><span className="live"><i /> Live</span></div>
    {error && <div className="error">{error}</div>}
    <section className="system-metrics-grid">
      <MetricGauge icon={Cpu} label="CPU" value={data?.system.cpu.usagePercent || 0} detail={`${data?.system.cpu.cores || "—"} cores`} />
      <MetricGauge icon={Activity} label="RAM" value={data ? percent(data.system.ram.usedBytes, data.system.ram.totalBytes) : 0} detail={data ? `${gigabytes(data.system.ram.usedBytes)} / ${gigabytes(data.system.ram.totalBytes)}` : "Loading"} />
      <MetricGauge icon={HardDrive} label="Storage" value={data ? percent(data.system.storage.usedBytes, data.system.storage.totalBytes) : 0} detail={data ? `${gigabytes(data.system.storage.usedBytes)} / ${gigabytes(data.system.storage.totalBytes)}` : "Loading"} />
      <article className="system-metric uptime-metric"><div className="metric-heading"><Clock size={18} /><span>Server uptime</span></div><strong>{data ? uptimeLabel(data.system.uptimeSeconds) : "—"}</strong><small>Since the last server restart</small></article>
    </section>
    <section className="overview-totals">
      <article><span>Devices</span><strong>{data?.totals.devices ?? "—"}</strong><div className="progress-bar"><i style={{ width: `${onlinePercent}%` }} /></div><small>{data?.totals.onlineDevices ?? "—"} online · {onlinePercent}%</small></article>
      <article><span>Users</span><strong>{data?.totals.users ?? "—"}</strong><div className="progress-bar blue"><i style={{ width: `${data?.totals.users ? Math.min(100, data.totals.administrators / data.totals.users * 100) : 0}%` }} /></div><small>{data?.totals.administrators ?? "—"} administrators</small></article>
      <article><span>Device errors</span><strong className={data?.totals.errorDevices ? "danger-text" : ""}>{data?.totals.errorDevices ?? "—"}</strong><div className="progress-bar red"><i style={{ width: `${data?.totals.devices ? data.totals.errorDevices / data.totals.devices * 100 : 0}%` }} /></div><small>Reported error or alarm states</small></article>
    </section>
    <section className="panel overview-map-panel"><div className="panel-head"><div><h2>Device locations</h2><p>Green is normal; red indicates a reported error</p></div></div>
      {data?.devices.length ? <div className="overview-map-wrap"><button className="map-recenter-button" onClick={() => setMapRecenter(value => value + 1)}><MapPin size={15} /> Recenter</button><MapContainer center={[36.1911, 44.0092]} zoom={4} scrollWheelZoom className="overview-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FitDeviceBounds devices={data.devices} trigger={mapRecenter} />{data.devices.map(device => <Marker key={device.deviceId} position={[device.latitude, device.longitude]} icon={marker(device.error)}><Popup><div className="map-device-card"><div className="map-device-card-head"><span className={device.error ? "map-state error" : "map-state"} /><div><strong>{device.name}</strong><small>{device.typeId} · {device.online ? "Online" : "Offline"}</small></div></div><dl><div><dt>Device ID</dt><dd><code>{device.deviceId}</code></dd></div><div><dt>Owner</dt><dd>{device.owner ? device.owner.nickname ? `${device.owner.nickname} · ${device.owner.name}` : device.owner.name : "Unassigned"}</dd></div><div><dt>Location</dt><dd>{device.label || `${fixed(device.latitude, 4)}, ${fixed(device.longitude, 4)}`}</dd></div></dl>{device.error && <div className="map-errors"><span>Error codes</span>{device.errors.map(error => <code key={error}>{error}</code>)}</div>}<NavLink className="map-device-link" to={`/devices/${device.deviceId}`}>Open device <ChevronRight size={15} /></NavLink></div></Popup></Marker>)}</MapContainer></div> : <div className="empty"><MapPin /><strong>No device locations</strong><span>Set device locations to display the organization map.</span></div>}
    </section>
  </main>;
}

function Overview() {
  const { user } = useAuth();
  const { devices, loading, error } = useDevices();
  const online = devices.filter(d => d.online).length;
  const latest = devices.slice(0, 5);
  if (user?.role === "admin") return <AdminOverview name={user.name} />;

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
      <div className="panel-head"><div><h2>Your devices</h2><p>Latest readings and connection status</p></div><NavLink to="/devices">View all <ChevronRight size={16} /></NavLink></div>
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

function deviceErrors(state: Record<string, unknown> | undefined) {
  if (!state) return [];
  return Object.entries(state).flatMap(([key, value]) => {
    if (!/(error|fault|alarm)/i.test(key)) return [];
    const normal = [undefined, null, false, 0, "0", "", "false", "none", "ok"];
    const normalized = typeof value === "string" ? value.toLowerCase() : value;
    if (normal.includes(normalized as never)) return [];
    if (Array.isArray(value)) return value.map(entry => `${key}: ${String(entry)}`);
    if (value && typeof value === "object") return Object.entries(value)
      .filter(([, entry]) => !normal.includes(entry as never))
      .map(([code, entry]) => `${key}.${code}: ${String(entry)}`);
    return [`${key}: ${String(value)}`];
  });
}

function DeviceRow({ device, showOwner }: { device: Device; showOwner?: boolean }) {
  const readings = getDisplayReadings(device.state || {});
  const errors = deviceErrors(device.state);
  return <NavLink className="device-row" to={`/devices/${device.deviceId}`}><div className={`device-icon ${errors.length ? "has-error" : ""}`}><Gauge /></div><div className="device-name"><strong>{device.name}</strong><small>{device.typeName || device.typeId}{showOwner ? ` · ID: ${device.deviceId} · ${device.owner ? device.owner.nickname ? `${device.owner.nickname} · ${device.owner.name}` : device.owner.name : "Unassigned"}` : ""}</small>{errors.length > 0 && <span className="device-error-badge">{errors[0]}{errors.length > 1 ? ` +${errors.length - 1}` : ""}</span>}</div><span className={device.online ? "status online" : "status"}><i />{device.online ? "Online" : "Offline"}</span><div className="reading">{readings.map(reading => <span key={reading.label}><small>{reading.label}</small>{reading.value}</span>)}</div><ChevronRight className="row-arrow" /></NavLink>;
}

function Devices() {
  const { user } = useAuth();
  const { devices, loading, error, refresh } = useDevices();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [showAddDevice, setShowAddDevice] = useState(false);
  const filtered = devices.filter(d => `${d.name} ${d.deviceId} ${d.typeName || d.typeId} ${d.owner?.name || ""} ${d.owner?.nickname || ""} ${d.owner?.email || ""} ${d.owner?.phone || ""}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    if (sort === "owner") return (a.owner?.nickname || a.owner?.name || "").localeCompare(b.owner?.nickname || b.owner?.name || "");
    if (sort === "status") return Number(b.online) - Number(a.online);
    if (sort === "type") return (a.typeName || a.typeId).localeCompare(b.typeName || b.typeId);
    return a.name.localeCompare(b.name);
  });
  return <main className="content">
    <div className="page-title"><div><span className="eyebrow">ASSET DIRECTORY</span><h1>Devices</h1><p>{user?.role === "admin" ? "Manage all devices and their owners." : "Monitor and manage your devices."}</p></div><button className="primary-button compact" onClick={() => setShowAddDevice(true)}><Plus size={18} /> Add device</button></div>
    <div className="toolbar">{user?.role === "admin" && <div className="input-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, ID, owner or nickname" /></div>}<select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Sort by name</option><option value="type">Sort by type</option><option value="status">Sort by status</option>{user?.role === "admin" && <option value="owner">Sort by owner</option>}</select></div>
    {error && <div className="error">{error}</div>}
    <section className="panel"><div className="device-list">{loading ? <div className="loading-text">Loading devices…</div> : filtered.length ? filtered.map(d => <DeviceRow key={d.deviceId} device={d} showOwner={user?.role === "admin"} />) : <Empty />}</div></section>
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
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    deviceId: "",
    name: "",
    typeId: "",
    ownerUserId: "",
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
    if (user?.role === "admin") {
      api<{ users: User[] }>("/users").then(response => {
        const activeUsers = response.users.filter(entry => entry.active);
        setUsers(activeUsers);
        if (activeUsers[0]) setForm(current => ({ ...current, ownerUserId: activeUsers[0].userId }));
      }).catch(loadError => setError(loadError.message));
    }
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
      <label>Device ID<input value={form.deviceId} onChange={event => setForm({ ...form, deviceId: event.target.value.toUpperCase() })} placeholder="AHU-LOBBY-01" pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,63}" required /><small>Use the unique ID configured in the physical device.</small></label>
      <label>Device name<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Lobby air handler" maxLength={120} required /></label>
      {user?.role === "admin" && <label>Owner<select value={form.ownerUserId} onChange={event => setForm({ ...form, ownerUserId: event.target.value })}><option value="">Unassigned</option>{users.map(owner => <option key={owner.userId} value={owner.userId}>{owner.nickname || owner.name} ({owner.deviceCount || 0}/{owner.deviceLimit === null ? "Unlimited" : owner.deviceLimit ?? 1})</option>)}</select></label>}
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
    <div className="motor-gauge">
      <svg viewBox="0 0 110 62" aria-hidden="true">
        <path className="gauge-track" pathLength="100" d="M 10 55 A 45 45 0 0 1 100 55" />
        <path className="gauge-value" pathLength="100" strokeDasharray={`${speed} 100`} d="M 10 55 A 45 45 0 0 1 100 55" />
      </svg>
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
  { key: "TurboONOFF", label: "Turbo" }
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
  const errors = deviceErrors(state);

  if (!sensors.length && !statuses.length && !errors.length) return null;

  return <section className="panel equipment-panel">
    <div className="panel-head"><div><h2>Equipment readings</h2></div></div>
    <div className="equipment-grid">
      {sensors.map(sensor => <article className="equipment-reading" key={sensor.key}><span>{sensor.label}</span><strong>{fixed(sensor.value)} <small>{sensor.unit}</small></strong></article>)}
      {statuses.map(status => <article className="equipment-status" key={status.key}><i className={status.active ? "active" : ""} /><span>{status.label}</span><strong>{status.active ? "On" : "Off"}</strong></article>)}
      {errors.length > 0 && <article className="equipment-error-text"><span>Reported errors</span>{errors.map(error => <code key={error}>{error}</code>)}</article>}
    </div>
  </section>;
}

const toggleControls = [
  { key: "SystemONOFF", label: "System" },
  { key: "Eco", label: "Eco mode" },
  { key: "AutoManual", label: "Automatic mode" },
  { key: "Fan1", label: "Fan 1" },
  { key: "Fan2", label: "Fan 2" },
  { key: "Night", label: "Night mode" },
  { key: "PumpONOFF", label: "Pump" },
  { key: "TurboONOFF", label: "Turbo" }
];

function DeviceControls({
  deviceId,
  state
}: {
  deviceId: string;
  state: Record<string, unknown>;
}) {
  const [pending, setPending] = useState("");
  const [temperature, setTemperature] = useState(
    String(numberFrom(state, "TempSet") ?? 22)
  );
  const [message, setMessage] = useState("");

  async function send(key: string, value: string | number) {
    setPending(key);
    setMessage("");
    try {
      await api(`/devices/${deviceId}/command`, {
        method: "POST",
        body: JSON.stringify({
          command: "set_parameter",
          value: { key, value }
        })
      });
      setMessage("Command sent");
    } catch (commandError) {
      setMessage(commandError instanceof Error ? commandError.message : "Command failed");
    } finally {
      setPending("");
    }
  }

  return <section className="panel controls-panel">
    <div className="panel-head"><div><h2>Device controls</h2></div>{message && <span className="control-message">{message}</span>}</div>
    <div className="controls-grid">
      <div className="setpoint-control"><span>Temperature setpoint</span><div><input type="number" step="1" value={temperature} onChange={event => setTemperature(event.target.value)} /><span>°C</span><button disabled={pending === "TempSet"} onClick={() => send("TempSet", Math.round(Number(temperature)))}>Set</button></div></div>
      {toggleControls.map(control => {
        const active = !["0", "false", "off", "", "undefined"].includes(String(state[control.key]).toLowerCase());
        return <button className={`toggle-control ${active ? "active" : ""}`} disabled={pending === control.key} key={control.key} onClick={() => send(control.key, active ? "0" : "1")}><span>{control.label}</span><i><b /></i></button>;
      })}
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [weather, setWeather] = useState<WeatherReading | null>(null);
  const [location, setLocation] = useState({ latitude: 36.1911, longitude: 44.0092, label: "Erbil" });
  const [nameDraft, setNameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [owners, setOwners] = useState<User[]>([]);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [savingOwner, setSavingOwner] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<Array<{
    id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string;
  }>>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

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
    let active = true;
    let initialLoad = true;
    setError("");
    const loadInsight = () => Promise.all([
        api<{ device: Device }>(`/devices/${deviceId}`),
        api<{ telemetry: TelemetryPoint[] }>(`/devices/${deviceId}/telemetry?limit=100`)
      ])
      .then(([deviceResponse, telemetryResponse]) => {
        if (!active) return;
        setDevice(deviceResponse.device);
        setTelemetry(telemetryResponse.telemetry);
        const wasInitialLoad = initialLoad;
        if (wasInitialLoad) {
          initialLoad = false;
          setOwnerUserId(deviceResponse.device.ownerUserId || "");
          setNameDraft(deviceResponse.device.name);
        }
        if (wasInitialLoad && hasCoordinates(deviceResponse.device.location)) {
          setLocation({
            ...deviceResponse.device.location,
            label: deviceResponse.device.location.label || ""
          });
          void loadWeather();
        }
      })
      .catch(loadError => {
        if (active) setError(loadError.message);
      });
    void loadInsight();
    const insightInterval = window.setInterval(loadInsight, 3000);
    if (user?.role === "admin") {
      api<{ users: User[] }>("/users")
        .then(response => setOwners(response.users.filter(owner => owner.active)))
        .catch(loadError => setError(loadError.message));
    }
    return () => {
      active = false;
      window.clearInterval(insightInterval);
    };
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

  async function removeDevice() {
    if (!device) return;
    const confirmation = window.prompt(`DANGER: This permanently deletes ${device.name} and all of its telemetry and command history.\n\nType the device name to confirm.`);
    if (confirmation !== device.name) return;
    try {
      await api(`/devices/${deviceId}`, { method: "DELETE", body: JSON.stringify({ confirmation }) });
      navigate("/devices", { replace: true });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete device");
    }
  }

  async function saveOwner() {
    setSavingOwner(true); setError("");
    try {
      const response = await api<{ device: Device }>(`/devices/${deviceId}`, {
        method: "PATCH",
        body: JSON.stringify({ ownerUserId: ownerUserId || null })
      });
      setDevice(current => current ? { ...current, ownerUserId: response.device.ownerUserId } : current);
    } catch (ownerError) {
      setError(ownerError instanceof Error ? ownerError.message : "Could not change owner");
    } finally { setSavingOwner(false); }
  }

  async function searchLocation(event: FormEvent) {
    event.preventDefault();
    const query = locationQuery.trim();
    if (query.length < 2) return;
    setSearchingLocation(true); setError("");
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
      );
      if (!response.ok) throw new Error("Location search is temporarily unavailable");
      const body = await response.json();
      setLocationResults(Array.isArray(body.results) ? body.results : []);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Could not search locations");
    } finally { setSearchingLocation(false); }
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
      <div className="page-actions"><button className="secondary-button" onClick={() => setShowLocation(true)}><MapPin size={16} /> {hasCoordinates(device.location) ? "Change location" : "Set location"}</button><button className="icon-danger" title="Permanently delete device" onClick={removeDevice}><Trash2 size={17} /></button><NavLink className="secondary-link" to="/devices">Back to devices</NavLink></div>
    </div>
    {error && <div className="error">{error}</div>}

    {user?.role === "admin" && <section className="panel device-admin-panel"><div><span className="eyebrow">ADMIN DEVICE DETAILS</span><strong>Device ID: <code>{device.deviceId}</code></strong></div><label>Assigned owner<select value={ownerUserId} onChange={event => setOwnerUserId(event.target.value)}><option value="">Unassigned</option>{owners.map(owner => <option key={owner.userId} value={owner.userId}>{owner.nickname || owner.name} · {owner.email || owner.phone}</option>)}</select></label><button className="primary-button compact" disabled={savingOwner || ownerUserId === (device.ownerUserId || "")} onClick={saveOwner}>{savingOwner ? "Saving…" : "Save owner"}</button></section>}

    <section className="device-metrics">
      <Stat icon={Thermometer} label="Device temperature" value={`${fixed(numberFromAny(device.state || {}, "RoomTemp", "temperature"))} °C`} note="Latest device reading" tone="orange" />
      <Stat icon={Droplets} label="Device humidity" value={`${fixed(numberFromAny(device.state || {}, "Humidity", "humidity"))}%`} note="Latest device reading" tone="blue" />
      <MotorSpeedGauge value={numberFromAny(device.state || {}, "MotorSpeed")} />
      <Stat icon={Thermometer} label="Outdoor temperature" value={weather ? `${fixed(weather.temperature)} °C` : "—"} note={device.location?.label || "Set device location"} tone="green" />
    </section>

    <EquipmentReadings state={device.state || {}} />
    <DeviceControls deviceId={deviceId} state={device.state || {}} />

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
      <form className="map-search" onSubmit={searchLocation}><Search size={17} /><input value={locationQuery} onChange={event => setLocationQuery(event.target.value)} placeholder="Search city, neighborhood, or postal code" /><button disabled={searchingLocation}>{searchingLocation ? "Searching…" : "Search"}</button></form>
      {locationResults.length > 0 && <div className="map-search-results">{locationResults.map(result => <button key={result.id} onClick={() => { setLocation({ latitude: result.latitude, longitude: result.longitude, label: [result.name, result.admin1, result.country].filter(Boolean).join(", ") }); setLocationResults([]); setLocationQuery(result.name); }}><strong>{result.name}</strong><span>{[result.admin1, result.country].filter(Boolean).join(", ")}</span></button>)}</div>}
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
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const load = () => api<{ users: User[] }>("/users").then(r => setUsers(r.users)).catch(e => setError(e.message));
  const filteredUsers = users.filter(user =>
    `${user.name} ${user.nickname || ""} ${user.email || ""} ${user.phone || ""} ${user.role}`.toLowerCase().includes(query.toLowerCase())
  );
  useEffect(() => { load(); }, []);

  async function toggle(user: User) {
    try {
      await api(`/users/${user.userId}`, { method: "PATCH", body: JSON.stringify({ active: !user.active }) });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
  }

  async function remove(user: User) {
    const contact = user.email || user.phone || "";
    const confirmation = window.prompt(`DANGER: This permanently deletes ${user.name}, all owned devices, and all their data.\n\nType ${contact} to confirm.`);
    if (confirmation !== contact) return;
    try {
      await api(`/users/${user.userId}`, { method: "DELETE", body: JSON.stringify({ confirmation }) });
      load();
    } catch (e) { setError(e instanceof Error ? e.message : "Deletion failed"); }
  }

  return <main className="content">
    <div className="page-title"><div><span className="eyebrow">ADMINISTRATION</span><h1>User access</h1><p>Control who can access this organization and what they can do.</p></div><button className="primary-button compact" onClick={() => setShowForm(true)}><Plus size={18} /> Add user</button></div>
    <div className="toolbar"><div className="input-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, nickname, email, phone or role" /></div></div>
    {error && <div className="error">{error}</div>}
    <section className="panel user-table">
      <div className="table-head"><span>User</span><span>Devices</span><span>Status</span><span>Actions</span></div>
      {filteredUsers.map(user => <div className="table-row" key={user.userId}><div className="user-cell"><span className="avatar">{user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.nickname || user.name}</strong><small>{user.nickname ? `${user.name} · ` : ""}{[user.email, user.phone].filter(Boolean).join(" · ")}{user.primaryAdmin ? " · Primary admin" : ""}</small></div></div><span className="role"><ShieldCheck size={15} /> {user.deviceCount || 0} / {user.deviceLimit === null ? "Unlimited" : user.deviceLimit ?? 1}</span><span className={user.active ? "status online" : "status"}><i />{user.active ? "Active" : "Disabled"}</span><div className="row-actions"><button className="text-button" onClick={() => setEditingUser(user)}>Edit</button><button className="text-button" disabled={user.primaryAdmin} onClick={() => toggle(user)}>{user.primaryAdmin ? "Protected" : user.active ? "Disable" : "Enable"}</button><button className="icon-danger" disabled={user.primaryAdmin} onClick={() => remove(user)} title="Permanently delete"><Trash2 size={16} /></button></div></div>)}
    </section>
    {showForm && <NewUser onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    {editingUser && <EditUser user={editingUser} onClose={() => setEditingUser(null)} onSaved={() => { setEditingUser(null); load(); }} />}
  </main>;
}

function EditUser({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nickname: user.nickname || "", email: user.email || "", phone: user.phone || "", role: user.role, active: user.active !== false, deviceLimit: user.deviceLimit ?? 1 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api(`/users/${user.userId}`, { method: "PATCH", body: JSON.stringify(form) });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed"); setBusy(false); }
  }
  async function resetPassword() {
    setError(""); setResetMessage("");
    if (temporaryPassword.length < 8 || temporaryPassword !== confirmTemporaryPassword) {
      setError("Temporary passwords must match and contain at least 8 characters"); return;
    }
    try {
      await api(`/users/${user.userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ temporaryPassword })
      });
      setTemporaryPassword(""); setConfirmTemporaryPassword("");
      setResetMessage("Temporary password set");
    } catch (e) { setError(e instanceof Error ? e.message : "Password reset failed"); }
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-title"><div><h2>Manage user</h2><p>{user.name} · {user.email || user.phone}</p></div><button type="button" onClick={onClose}><X /></button></div>
    <label>Admin nickname<input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} maxLength={80} placeholder="Optional internal label" /></label>
    <label>Email address<input type="email" disabled={user.primaryAdmin} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
    <label>Phone number<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+964…" /></label>
    <label>Device allowance{user.primaryAdmin ? <input value="Unlimited" disabled /> : <input type="number" min={0} max={100} value={form.deviceLimit} onChange={e => setForm({ ...form, deviceLimit: Number(e.target.value) })} />}</label>
    <label>Access level<select disabled={user.primaryAdmin} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}><option value="user">User</option><option value="admin">Administrator</option></select></label>
    <label className="checkbox-row"><input type="checkbox" disabled={user.primaryAdmin} checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Account active</label>
    {!user.primaryAdmin && <fieldset className="password-reset-box"><legend>Reset forgotten password</legend><p>Set a temporary password and provide it securely to this user.</p><label>Temporary password<input type="password" minLength={8} value={temporaryPassword} onChange={e => setTemporaryPassword(e.target.value)} /></label><label>Confirm temporary password<input type="password" minLength={8} value={confirmTemporaryPassword} onChange={e => setConfirmTemporaryPassword(e.target.value)} /></label><button type="button" className="secondary-button" onClick={resetPassword}>Set temporary password</button>{resetMessage && <div className="success">{resetMessage}</div>}</fieldset>}
    {error && <div className="error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
  </form></div>;
}

function NewUser({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "user" as Role });
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
    <label>Email (optional)<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
    <label>Phone (optional)<input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+964…" /></label>
    <label>Temporary password<input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>
    <label>Access level<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as Role })}><option value="user">User — monitor and control devices</option><option value="admin">Admin — manage users and organization</option></select></label>
    {error && <div className="error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact">Create user</button></div>
  </form></div>;
}

function AlarmCenter() {
  const feed = useAlarms();
  const { user } = useAuth();
  return <main className="content"><div className="page-title"><div><span className="eyebrow">NOTIFICATIONS</span><h1>Alarms</h1><p>Errors reported by devices assigned to you.</p></div>{feed.alarms.length > 0 && <button className="secondary-button" onClick={() => void feed.dismissAll()}><Trash2 size={16} /> Clear all</button>}</div>
    {feed.error && <div className="error">{feed.error}</div>}
    <section className="panel alarm-center">{feed.alarms.map(alarm => <article className={`${alarm.read ? "" : "unread"} ${alarm.resolvedAt ? "resolved" : ""}`} key={alarm._id}><span className="alarm-severity"><Bell size={18} /></span><div className="alarm-content"><div><strong>{alarm.deviceName}</strong><span className={alarm.resolvedAt ? "alarm-status resolved" : "alarm-status"}>{alarm.resolvedAt ? "Resolved" : "Active"}</span></div><p>{alarm.message}</p>{user?.role === "admin" && <small className="alarm-owner">Owner: {alarm.owner ? alarm.owner.nickname ? `${alarm.owner.nickname} · ${alarm.owner.name}` : alarm.owner.name : "Unassigned"}</small>}<small><code>{alarm.code}</code> · {new Date(alarm.createdAt).toLocaleString()}</small></div><div className="alarm-actions">{!alarm.read && <button className="text-button" onClick={() => void feed.read(alarm._id)}>Mark read</button>}<NavLink className="text-button" to={`/devices/${alarm.deviceId}`}>Open device</NavLink><button className="icon-danger" title="Dismiss alarm" onClick={() => void feed.dismiss(alarm._id)}><X size={16} /></button></div></article>)}{feed.alarms.length === 0 && <div className="empty"><Bell /><strong>No alarms</strong><span>Device errors and faults will appear here.</span></div>}</section>
  </main>;
}

function OrganizationSettings() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ organization: Organization }>("/organizations/current")
      .then(response => setOrganization(response.organization))
      .catch(e => setError(e.message));
  }, []);
  function chooseLogo(file?: File) {
    if (!file || !organization) return;
    if (file.size > 250_000) { setError("Choose a logo smaller than 250 KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setOrganization({ ...organization, logo: String(reader.result) });
    reader.readAsDataURL(file);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!organization) return; setError(""); setMessage("");
    try {
      const result = await api<{ organization: Organization }>("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({ name: organization.name, code: organization.code || "ORG001", logo: organization.logo || "" })
      });
      setOrganization(result.organization); setMessage("Organization branding updated");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update organization"); }
  }
  if (!organization) return error ? <div className="error">{error}</div> : null;
  return <section className="panel settings-panel"><form onSubmit={save}><h2>Organization branding</h2><div className="profile-photo"><span className="org-logo-preview">{organization.logo ? <img src={organization.logo} alt="" /> : <Activity />}</span><label className="secondary-button compact"><Upload size={16} /> Choose logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => chooseLogo(e.target.files?.[0])} hidden /></label>{organization.logo && <button type="button" className="text-button" onClick={() => setOrganization({ ...organization, logo: "" })}>Remove logo</button>}</div><label>Organization name<input value={organization.name} onChange={e => setOrganization({ ...organization, name: e.target.value })} maxLength={120} required /></label><label>Organization code<input value={organization.code || ""} onChange={e => setOrganization({ ...organization, code: e.target.value.toUpperCase() })} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,39}" placeholder="ORG001" required /><small>This editable code is shown in the dashboard. Internal data references remain unchanged.</small></label>{message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}<button className="primary-button compact">Save organization</button></form></section>;
}

function ProfileSettings() {
  const { user, logout, setCurrentUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || "");
  const [theme, setTheme] = useState<Theme>(user?.theme || "default");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [muteAlarmNotifications, setMuteAlarmNotifications] = useState(Boolean(user?.muteAlarmNotifications));
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  if (!user) return null;
  function choosePhoto(file?: File) {
    if (!file) return;
    if (file.size > 250_000) { setError("Choose an image smaller than 250 KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setProfilePhoto(String(reader.result));
    reader.readAsDataURL(file);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const result = await api<{ user: User }>("/auth/me", { method: "PATCH", body: JSON.stringify({ name, email, phone, profilePhoto, theme, muteAlarmNotifications }) });
      setCurrentUser(result.user); setMessage("Profile updated");
    } catch (e) { setError(e instanceof Error ? e.message : "Update failed"); }
  }

  async function removeAccount() {
    if (confirmation !== "DELETE MY ACCOUNT") return;
    try {
      await api("/auth/me", { method: "DELETE", body: JSON.stringify({ confirmation }) });
      logout();
    } catch (e) { setError(e instanceof Error ? e.message : "Deletion failed"); }
  }
  async function savePassword(event: FormEvent) {
    event.preventDefault(); setError(""); setPasswordMessage("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New passwords do not match"); return;
    }
    try {
      await api("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Password changed");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not change password"); }
  }
  return <main className="content"><div className="page-title"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>Profile settings</h1><p>Update the identity shown in your panel.</p></div></div>
    <section className="panel settings-panel"><form onSubmit={save}><div className="profile-photo"><span className="avatar large">{profilePhoto ? <img src={profilePhoto} alt="" /> : name.slice(0, 2).toUpperCase()}</span><label className="secondary-button compact"><Upload size={16} /> Choose photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => choosePhoto(e.target.files?.[0])} hidden /></label></div><label>Display name<input value={name} onChange={e => setName(e.target.value)} maxLength={120} required /></label><label>Email address<input type="email" disabled={user.primaryAdmin} value={email} onChange={e => setEmail(e.target.value)} /><small>{user.primaryAdmin ? "The primary administrator email is controlled by the server environment." : "Keep an email or phone number on the account."}</small></label><label>Phone number<input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+964…" /></label><label>Account theme<select value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="default">Default white</option><option value="dark">Night</option><option value="spring">Spring</option><option value="summer">Summer</option><option value="autumn">Autumn</option><option value="winter">Winter</option></select></label>{user.role === "admin" && <label className="checkbox-row"><input type="checkbox" checked={muteAlarmNotifications} onChange={e => setMuteAlarmNotifications(e.target.checked)} /> Mute error notification bell <small>Alarms remain available on the Alarms page.</small></label>}{message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}<button className="primary-button compact">Save profile</button></form></section>
    {user.role === "admin" && <OrganizationSettings />}
    <section className="panel settings-panel"><form onSubmit={savePassword}><h2>Change password</h2><label>Current password<input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></label><label>New password<input type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required /></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required /></label>{passwordMessage && <div className="success">{passwordMessage}</div>}<button className="primary-button compact">Change password</button></form></section>
    {!user.primaryAdmin && <section className="panel danger-zone"><h2>Delete account</h2><p>This permanently removes your account, devices, telemetry, and command history. It cannot be recovered.</p><label>Type DELETE MY ACCOUNT<input value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label><button className="danger-button" disabled={confirmation !== "DELETE MY ACCOUNT"} onClick={removeAccount}><Trash2 size={16} /> Permanently delete account</button></section>}
  </main>;
}

function Empty() {
  return <div className="empty"><Box /><strong>No devices found</strong><span>Devices assigned to this organization will appear here.</span></div>;
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return <main className="content"><div className="page-title"><div><h1>{title}</h1><p>{text}</p></div></div><section className="panel empty"><Settings /><strong>Coming next</strong><span>This area is ready for the next implementation phase.</span></section></main>;
}

export default function App() {
  return <Routes><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="/*" element={<Shell />} /></Routes>;
}
