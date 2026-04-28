import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const STORES = ["Honda of Pasadena", "CDJR Hyundai Seattle", "El Cajon Ford", "Brandon Ford", "Friendly Ford"];
const HOLIDAYS = new Set(["2026-01-01", "2026-05-25", "2026-07-04", "2026-09-07", "2026-11-26", "2026-12-25"]);
const DEFAULT_USERS = {
  richard: { password: "director123", name: "Richard / Director", role: "director", store: "All Stores" },
  pasadena: { password: "pasadena123", name: "Honda of Pasadena Login", role: "dealer", store: "Honda of Pasadena" },
  seattle: { password: "seattle123", name: "CDJR Hyundai Seattle Login", role: "dealer", store: "CDJR Hyundai Seattle" },
  elcajon: { password: "elcajon123", name: "El Cajon Ford Login", role: "dealer", store: "El Cajon Ford" },
  brandon: { password: "brandon123", name: "Brandon Ford Login", role: "dealer", store: "Brandon Ford" },
  friendly: { password: "friendly123", name: "Friendly Ford Login", role: "dealer", store: "Friendly Ford" },
};
const FIELDS = [
  { key: "ros", label: "Repair Orders" },
  { key: "hours", label: "Labor Hours" },
  { key: "labor", label: "Total Labor" },
  { key: "laborGross", label: "Labor Gross" },
  { key: "parts", label: "Total Parts" },
  { key: "partsGross", label: "Parts Gross" },
];
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function dateKey(date) { return date.toISOString().slice(0, 10); }
function isOpenBusinessDay(date) { return date.getDay() !== 0 && !HOLIDAYS.has(dateKey(date)); }
function priorOpenBusinessDay(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - 1);
  while (!isOpenBusinessDay(d)) d.setDate(d.getDate() - 1);
  return dateKey(d);
}
function money(n) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }
function num(n) { return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 1 }); }
function pct(n) { return `${Number(n || 0).toFixed(1)}%`; }
function blankData() { return Object.fromEntries(STORES.map((s) => [s, {}])); }
function camel(row) {
  return { ros: Number(row.ros || 0), hours: Number(row.hours || 0), labor: Number(row.labor || 0), laborGross: Number(row.labor_gross || 0), parts: Number(row.parts || 0), partsGross: Number(row.parts_gross || 0) };
}
function snake(entry) {
  return { ros: Number(entry.ros || 0), hours: Number(entry.hours || 0), labor: Number(entry.labor || 0), labor_gross: Number(entry.laborGross || 0), parts: Number(entry.parts || 0), parts_gross: Number(entry.partsGross || 0), updated_at: new Date().toISOString() };
}

export default function App() {
  const [login, setLogin] = useState({ username: "", password: "" });
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [dailyData, setDailyData] = useState(blankData());
  const [tab, setTab] = useState("DAILY ENTRY");
  const [selectedStore, setSelectedStore] = useState(STORES[0]);
  const [selectedDate, setSelectedDate] = useState(priorOpenBusinessDay());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [passwordBox, setPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => { loadCloudData(); }, []);

  async function loadCloudData() {
    setLoading(true);
    setError("");
    if (!supabase) {
      setError("Supabase is not connected. Check Vercel environment variables.");
      setLoading(false);
      return;
    }
    const [{ data: userRows, error: userErr }, { data: entryRows, error: entryErr }] = await Promise.all([
      supabase.from("dealer_users").select("*"),
      supabase.from("daily_entries").select("*").order("entry_date", { ascending: true })
    ]);
    if (userErr || entryErr) {
      setError(`Supabase load error: ${userErr?.message || entryErr?.message}`);
      setLoading(false);
      return;
    }
    const nextUsers = { ...DEFAULT_USERS };
    (userRows || []).forEach((u) => { nextUsers[u.username] = { password: u.password, name: u.name, role: u.role, store: u.store }; });
    const nextData = blankData();
    (entryRows || []).forEach((r) => {
      if (!nextData[r.store]) nextData[r.store] = {};
      nextData[r.store][r.entry_date] = camel(r);
    });
    setUsers(nextUsers);
    setDailyData(nextData);
    setLoading(false);
  }

  async function saveEntry(store, entryDate, entry) {
    if (!supabase) return;
    const payload = { store, entry_date: entryDate, ...snake(entry) };
    const { error: saveErr } = await supabase.from("daily_entries").upsert(payload, { onConflict: "store,entry_date" });
    if (saveErr) setError(`Save error: ${saveErr.message}`);
    else setNotice("Saved online.");
  }

  async function savePassword(username, password) {
    if (!supabase) return;
    const current = users[username];
    const { error: passErr } = await supabase.from("dealer_users").upsert({ username, password, name: current.name, role: current.role, store: current.store }, { onConflict: "username" });
    if (passErr) setError(`Password save error: ${passErr.message}`);
  }

  function handleLogin() {
    const username = login.username.trim().toLowerCase();
    const found = users[username];
    if (!found || found.password !== login.password) {
      setError("Login failed. Please check username and password.");
      return;
    }
    setUser({ username, ...found });
    setSelectedStore(found.role === "director" ? STORES[0] : found.store);
    setError("");
    setNotice("");
  }

  async function handlePasswordChange() {
    if (!newPassword.trim()) { setError("Password cannot be blank."); return; }
    const next = { ...users, [user.username]: { ...users[user.username], password: newPassword.trim() } };
    setUsers(next);
    await savePassword(user.username, newPassword.trim());
    setNewPassword("");
    setPasswordBox(false);
    setNotice("Password updated online.");
  }

  async function updateEntry(field, value) {
    const store = user?.role === "director" ? selectedStore : user?.store;
    const existing = dailyData[store]?.[selectedDate] || {};
    const proposed = { ...existing, [field]: Number(value || 0) };
    if (Number(proposed.laborGross || 0) > Number(proposed.labor || 0)) { setError("Labor Gross cannot be higher than Total Labor."); return; }
    if (Number(proposed.partsGross || 0) > Number(proposed.parts || 0)) { setError("Parts Gross cannot be higher than Total Parts."); return; }
    const next = { ...dailyData, [store]: { ...(dailyData[store] || {}), [selectedDate]: proposed } };
    setDailyData(next);
    setError("");
    await saveEntry(store, selectedDate, proposed);
  }

  const totalsByStore = useMemo(() => {
    return STORES.reduce((acc, store) => {
      const total = { ros: 0, hours: 0, labor: 0, laborGross: 0, parts: 0, partsGross: 0 };
      Object.values(dailyData[store] || {}).forEach((e) => FIELDS.forEach((f) => total[f.key] += Number(e[f.key] || 0)));
      acc[store] = total;
      return acc;
    }, {});
  }, [dailyData]);

  const groupTotals = useMemo(() => STORES.reduce((t, s) => {
    FIELDS.forEach((f) => t[f.key] += Number(totalsByStore[s]?.[f.key] || 0));
    return t;
  }, { ros: 0, hours: 0, labor: 0, laborGross: 0, parts: 0, partsGross: 0 }), [totalsByStore]);

  function metricCards(t) {
    const sales = t.labor + t.parts;
    const gross = t.laborGross + t.partsGross;
    return [
      ["Total RO's", num(t.ros)], ["Total Hours", num(t.hours)], ["Total Labor", money(t.labor)], ["Total Parts", money(t.parts)], ["Total Parts and Service", money(sales)], ["Month End Tracking", money(gross)], ["ELR", money(t.hours ? t.labor / t.hours : 0)], ["Gross Per RO", money(t.ros ? gross / t.ros : 0)], ["Parts-to-Labor Ratio", `${(t.labor ? t.parts / t.labor : 0).toFixed(2)}:1`], ["Gross Profit %", pct(sales ? gross / sales * 100 : 0)]
    ];
  }

  if (!user) return <LoginScreen loading={loading} login={login} setLogin={setLogin} handleLogin={handleLogin} error={error} />;
  const editableStore = user.role === "director" ? selectedStore : user.store;
  const currentEntry = dailyData[editableStore]?.[selectedDate] || {};

  return (
    <main className="app-shell">
      <section className="container">
        <header className="app-header">
          <div><h1>Fixed Ops Tracker</h1><p>Logged in as {user.name}</p></div>
          <div className="header-actions"><button className="secondary" onClick={() => setPasswordBox(!passwordBox)}>Change Password</button><button className="primary" onClick={() => setUser(null)}>Logout</button></div>
        </header>
        {passwordBox && <div className="card password-panel"><input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><button className="primary" onClick={handlePasswordChange}>Save Password</button></div>}
        {error && <div className="alert error">{error}</div>}{notice && !error && <div className="alert success">{notice}</div>}
        <nav className="tabs">{["DAILY ENTRY", "MONTHLY SUMMARY", "MTD & TRACKING", "DIRECTOR OVERVIEW"].map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</nav>
        {tab === "DAILY ENTRY" && <DailyEntry user={user} editableStore={editableStore} selectedStore={selectedStore} setSelectedStore={setSelectedStore} selectedDate={selectedDate} setSelectedDate={setSelectedDate} currentEntry={currentEntry} updateEntry={updateEntry} />}
        {tab === "MONTHLY SUMMARY" && <MonthlySummary totalsByStore={totalsByStore} metricCards={metricCards} />}
        {tab === "MTD & TRACKING" && <Tracking totalsByStore={totalsByStore} />}
        {tab === "DIRECTOR OVERVIEW" && <DirectorOverview totalsByStore={totalsByStore} groupTotals={groupTotals} metricCards={metricCards} />}
      </section>
    </main>
  );
}

function LoginScreen({ loading, login, setLogin, handleLogin, error }) {
  return <main className="login-page"><section className="login-card"><h1>Fixed Ops Tracker</h1><p className="subtitle">Dealer Operating Control Service</p><div className="login-fields"><input placeholder="Username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} /><input placeholder="Password" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />{error && <div className="alert error">{error}</div>}<button className="primary" disabled={loading} onClick={handleLogin}>{loading ? "Loading..." : "Login"}</button></div><p className="demo-note">Director demo: richard / director123<br />Dealer demos: pasadena, seattle, elcajon, brandon, friendly / matching password + 123</p></section></main>;
}
function DailyEntry({ user, editableStore, selectedStore, setSelectedStore, selectedDate, setSelectedDate, currentEntry, updateEntry }) {
  return <section className="card"><div className="entry-controls"><div><label>Store</label><select value={editableStore} disabled={user.role !== "director"} onChange={(e) => setSelectedStore(e.target.value)}>{STORES.map((s) => <option key={s}>{s}</option>)}</select></div><div><label>Working Day</label><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /><span>Defaults to the previous open business day. Sundays and holidays are skipped.</span></div></div><div className="entry-grid">{FIELDS.map((f) => <div className="entry-field" key={f.key}><label>{f.label}</label><input type="number" min="0" value={currentEntry[f.key] ?? ""} onChange={(e) => updateEntry(f.key, e.target.value)} /></div>)}</div></section>;
}
function MonthlySummary({ totalsByStore, metricCards }) { return <div className="stack">{STORES.map((s) => <section className="card dealer-card" key={s}><h2>{s}</h2><div className="bubble-grid five">{metricCards(totalsByStore[s]).slice(0,5).map(([l,v]) => <Bubble key={l} label={l} value={v} />)}</div><div className="bubble-grid two">{metricCards(totalsByStore[s]).slice(5,7).map(([l,v]) => <Bubble key={l} label={l} value={v} large />)}</div></section>)}</div>; }
function Tracking({ totalsByStore }) { return <div className="two-col">{STORES.map((s) => { const t = totalsByStore[s]; return <section className="card" key={s}><h2>{s}</h2><div className="stat-grid"><Stat label="Service Tracking" value={money(t.laborGross)} /><Stat label="Parts Tracking" value={money(t.partsGross)} /><Stat label="Total ROs" value={num(t.ros)} /><Stat label="Total Hours" value={num(t.hours)} /><Stat label="Total Labor" value={money(t.labor)} /><Stat label="Total Parts" value={money(t.parts)} /><Stat label="Month End Tracking Parts & Service" value={money(t.labor+t.parts)} wide /><Stat label="Tracking Gross End of Month" value={money(t.laborGross+t.partsGross)} wide /></div></section>; })}</div>; }
function DirectorOverview({ totalsByStore, groupTotals, metricCards }) { return <div className="stack"><section className="card"><h2>Group Overview</h2><div className="bubble-grid five">{metricCards(groupTotals).slice(0,5).map(([l,v]) => <Bubble key={l} label={l} value={v} />)}</div><div className="bubble-grid two"><Bubble label="Total Parts and Service" value={money(groupTotals.labor+groupTotals.parts)} large /><Bubble label="Month End Tracking" value={money(groupTotals.laborGross+groupTotals.partsGross)} large /></div></section><section className="dealer-row">{STORES.map((s) => { const t=totalsByStore[s]; return <div className="dealer-column" key={s}><h3>{s}</h3><Stat label="ROs" value={num(t.ros)} /><Stat label="Hours" value={num(t.hours)} /><Stat label="Group Labor Sale" value={money(t.labor)} /><Stat label="Group Parts Sale" value={money(t.parts)} /><Stat label="Tracking End of Month" value={money(t.labor+t.parts)} /><Stat label="Tracking Gross End of Month" value={money(t.laborGross+t.partsGross)} /></div>; })}</section><section className="card"><h2>Parts and Service Summary</h2><div className="table-wrap"><table><thead><tr><th>Store</th><th>ROs</th><th>Hours</th><th>Total Labor</th><th>Total Parts</th><th>Gross</th><th>ELR</th><th>Gross %</th></tr></thead><tbody>{STORES.map((s) => { const t=totalsByStore[s]; const gross=t.laborGross+t.partsGross; const sales=t.labor+t.parts; return <tr key={s}><td>{s}</td><td>{num(t.ros)}</td><td>{num(t.hours)}</td><td>{money(t.labor)}</td><td>{money(t.parts)}</td><td>{money(gross)}</td><td>{money(t.hours ? t.labor/t.hours : 0)}</td><td>{pct(sales ? gross/sales*100 : 0)}</td></tr>; })}</tbody></table></div></section></div>; }
function Bubble({ label, value, large }) { return <div className={`bubble ${large ? "large" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
function Stat({ label, value, wide }) { return <div className={`stat ${wide ? "wide" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
