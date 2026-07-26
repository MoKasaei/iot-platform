import { FormEvent, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity, Bell, Box, ChevronRight, Gauge, LayoutDashboard, LogOut,
  Menu, Plus, Search, Settings, ShieldCheck, Users, Wifi, WifiOff, X
} from "lucide-react";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Device, Role, User } from "./types";

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
  useEffect(() => {
    api<{ devices: Device[] }>("/devices")
      .then(r => setDevices(r.devices))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return { devices, loading, error };
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
  return <div className="device-row"><div className="device-icon"><Gauge /></div><div className="device-name"><strong>{device.name}</strong><small>{device.deviceId} · {device.typeId}</small></div><span className={device.online ? "status online" : "status"}><i />{device.online ? "Online" : "Offline"}</span><div className="reading">{Object.entries(device.state || {}).slice(0, 2).map(([key, value]) => <span key={key}><small>{key}</small>{String(value)}</span>)}</div><ChevronRight className="row-arrow" /></div>;
}

function Devices() {
  const { devices, loading, error } = useDevices();
  const [query, setQuery] = useState("");
  const filtered = devices.filter(d => `${d.name} ${d.deviceId} ${d.typeId}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="content">
    <div className="page-title"><div><span className="eyebrow">ASSET DIRECTORY</span><h1>Devices</h1><p>Monitor every device assigned to your organization.</p></div></div>
    <div className="toolbar"><div className="input-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a device" /></div></div>
    {error && <div className="error">{error}</div>}
    <section className="panel"><div className="device-list">{loading ? <div className="loading-text">Loading devices…</div> : filtered.length ? filtered.map(d => <DeviceRow key={d.deviceId} device={d} />) : <Empty />}</div></section>
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
      {users.map(user => <div className="table-row" key={user.userId}><div className="user-cell"><span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div><span className="role"><ShieldCheck size={15} /> {user.role}</span><span className={user.active ? "status online" : "status"}><i />{user.active ? "Active" : "Disabled"}</span><button className="text-button" onClick={() => toggle(user)}>{user.active ? "Disable" : "Enable"}</button></div>)}
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
