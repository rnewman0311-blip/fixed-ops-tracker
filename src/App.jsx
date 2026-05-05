import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const viteEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const cleanEnvValue = (value) => {
  if (!value) return "";
  let cleaned = String(value)
    .trim()
    .replace(/^VITE_SUPABASE_URL=/, "")
    .replace(/^VITE_SUPABASE_ANON_KEY=/, "")
    .replace(/^VITE_SUPABASE_PUBLISHABLE_KEY=/, "")
    .replace(/^NEXT_PUBLIC_SUPABASE_URL=/, "")
    .replace(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=/, "")
    .replace(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=/, "")
    .replace(/^['\"]|['\"]$/g, "")
    .trim();

  return cleaned
    .split("")
    .filter((ch) => ch !== " " && ch !== "\n" && ch !== "\r" && ch !== "\t")
    .join("");
};

const supabaseUrl = cleanEnvValue(viteEnv.VITE_SUPABASE_URL);
const supabaseKey = cleanEnvValue(viteEnv.VITE_SUPABASE_ANON_KEY || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY);
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const stores = ["Honda of Pasadena", "CDJR Hyundai Seattle", "El Cajon Ford", "Brandon Ford", "Friendly Ford"];

const logins = {
  director: { name: "Richard / Director", username: "richard", password: "director123", role: "director", store: "All Stores" },
  pasadena: { name: "Honda of Pasadena Login", username: "Honda of Pasadena", password: "pasadena123", role: "dealer", store: "Honda of Pasadena" },
  seattle: { name: "CDJR Hyundai Seattle Login", username: "CDJR Hyundai Seattle", password: "seattle123", role: "dealer", store: "CDJR Hyundai Seattle" },
  elcajon: { name: "El Cajon Ford Login", username: "El Cajon Ford", password: "elcajon123", role: "dealer", store: "El Cajon Ford" },
  brandon: { name: "Brandon Ford Login", username: "Brandon Ford", password: "brandon123", role: "dealer", store: "Brandon Ford" },
  friendly: { name: "Friendly Ford Login", username: "Friendly Ford", password: "friendly123", role: "dealer", store: "Friendly Ford" },
};

const today = () => new Date().toISOString().slice(0, 10);
const dateKey = (date) => date.toISOString().slice(0, 10);
const toNum = (value) => Number(String(value ?? "").replace(/[$,]/g, "")) || 0;
const money = (value) => toNum(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const qty = (value, digits = 0) => toNum(value).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const fixedHoliday = (year, month, day) => dateKey(new Date(year, month, day, 12));
const nthWeekday = (year, month, weekday, nth) => {
  const first = new Date(year, month, 1, 12);
  const offset = (weekday - first.getDay() + 7) % 7;
  return dateKey(new Date(year, month, 1 + offset + (nth - 1) * 7, 12));
};
const lastWeekday = (year, month, weekday) => {
  const last = new Date(year, month + 1, 0, 12);
  last.setDate(last.getDate() - ((last.getDay() - weekday + 7) % 7));
  return dateKey(last);
};
const holidays = (year) => ({
  [fixedHoliday(year, 0, 1)]: "New Year's Day",
  [lastWeekday(year, 4, 1)]: "Memorial Day",
  [fixedHoliday(year, 6, 4)]: "Independence Day",
  [nthWeekday(year, 8, 1, 1)]: "Labor Day",
  [nthWeekday(year, 10, 4, 4)]: "Thanksgiving",
  [fixedHoliday(year, 11, 25)]: "Christmas Day",
});
const dayStatus = (dateString) => {
  const d = new Date(`${dateString}T12:00:00`);
  const holiday = holidays(d.getFullYear())[dateString];
  if (d.getDay() === 0) return { closed: true, reason: "Sunday Closed" };
  if (holiday) return { closed: true, reason: holiday };
  return { closed: false, reason: "Open" };
};
const priorBusinessDay = () => {
  const d = new Date(`${today()}T12:00:00`);
  do d.setDate(d.getDate() - 1);
  while (dayStatus(dateKey(d)).closed);
  return dateKey(d);
};
const monthDates = (dateString) => {
  const d = new Date(`${dateString}T12:00:00`);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => dateKey(new Date(d.getFullYear(), d.getMonth(), i + 1, 12)));
};
const timing = (dateString) => {
  const selected = new Date(`${dateString}T12:00:00`);
  const dates = monthDates(dateString);
  const open = dates.filter((d) => !dayStatus(d).closed);
  const passed = open.filter((d) => new Date(`${d}T12:00:00`) <= selected);
  return { passed: passed.length, total: open.length, closed: dates.length - open.length };
};
const fmtMonth = (dateString) => new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const fmtDate = (dateString) => new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const blank = (store, date) => ({ id: `${store}-${date}`, store, date, repairOrders: "", hours: "", labor: "", parts: "", laborGross: "", partsGross: "" });
const emptyMonthData = (baseDate = today()) => {
  const seed = {};
  stores.forEach((store) => monthDates(baseDate).forEach((date) => (seed[`${store}-${date}`] = blank(store, date))));
  return seed;
};
const totalsOf = (rows) => {
  const t = rows.reduce((a, r) => {
    a.repairOrders += toNum(r.repairOrders);
    a.hours += toNum(r.hours);
    a.labor += toNum(r.labor);
    a.parts += toNum(r.parts);
    a.laborGross += toNum(r.laborGross);
    a.partsGross += toNum(r.partsGross);
    return a;
  }, { repairOrders: 0, hours: 0, labor: 0, parts: 0, laborGross: 0, partsGross: 0 });
  t.totalSale = t.labor + t.parts;
  t.totalGross = t.laborGross + t.partsGross;
  t.elr = t.hours ? t.labor / t.hours : 0;
  t.partsToLabor = t.labor ? t.parts / t.labor : 0;
  t.grossPerRo = t.repairOrders ? t.totalGross / t.repairOrders : 0;
  return t;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
function Stat({ title, value, sub }) {
  return <Card className="p-5 text-center"><p className="text-sm font-bold text-slate-500">{title}</p><p className="mt-2 text-3xl font-extrabold text-slate-950">{value}</p>{sub && <p className="mt-2 text-sm text-slate-500">{sub}</p>}</Card>;
}
function Progress({ percent }) {
  const p = Math.min(100, Math.max(0, percent));
  return <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-900" style={{ width: `${p}%` }} /></div>;
}
function Field({ label, value, onChange, disabled }) {
  return <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label><input className={`h-12 w-full rounded-xl border-2 px-3 text-lg outline-none ${disabled ? "border-slate-200 bg-slate-100 text-slate-400" : "border-yellow-400 bg-yellow-100 focus:border-yellow-600"}`} type="number" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="0" /></div>;
}
function Badge({ value, benchmark }) {
  const below = Number(value || 0) < Number(benchmark || 0);
  return <span className={`ml-2 rounded-full px-2 py-1 text-xs font-bold ${below ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{below ? "Below" : "At/Above"}</span>;
}

export default function FixedOpsTracker() {
  const [tab, setTab] = useState("daily");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeLoginKey, setActiveLoginKey] = useState(null);
  const [selectedStore, setSelectedStore] = useState(stores[0]);
  const [date, setDate] = useState(priorBusinessDay());
  const [entries, setEntries] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fixedOpsEntries") || "null") || emptyMonthData(); } catch { return emptyMonthData(); }
  });
  const [passwords, setPasswords] = useState(() => {
    try { return { ...Object.fromEntries(Object.entries(logins).map(([k, v]) => [k, v.password])), ...JSON.parse(localStorage.getItem("fixedOpsPasswords") || "{}") }; } catch { return Object.fromEntries(Object.entries(logins).map(([k, v]) => [k, v.password])); }
  });
  const [monthlySnapshots, setMonthlySnapshots] = useState({});
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [entryError, setEntryError] = useState("");
  const [dataStatus, setDataStatus] = useState(supabase ? "Connecting to Supabase..." : "Canvas preview uses browser storage. Live Vercel site will use Supabase.");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!supabase) return;
      setIsLoading(true);
      const [{ data: entryRows, error: entryErr }, { data: userRows }, { data: monthRows }] = await Promise.all([
        supabase.from("daily_entries").select("*").order("entry_date", { ascending: true }),
        supabase.from("user_accounts").select("*"),
        supabase.from("monthly_totals").select("*").order("month_key", { ascending: false }),
      ]);
      if (entryErr) {
        setDataStatus(`Supabase table issue: ${entryErr.message}`);
        setIsLoading(false);
        return;
      }
      if (userRows?.length) {
        const nextPasswords = { ...Object.fromEntries(Object.entries(logins).map(([k, v]) => [k, v.password])) };
        userRows.forEach((u) => { if (u.login_key && u.password) nextPasswords[u.login_key] = u.password; });
        setPasswords(nextPasswords);
      }
      if (monthRows?.length) {
        const next = {};
        monthRows.forEach((r) => (next[`${r.store}-${r.month_key}`] = r));
        setMonthlySnapshots(next);
      }
      const nextEntries = emptyMonthData(date);
      entryRows?.forEach((r) => {
        const entry = { id: r.id || `${r.store}-${r.entry_date}`, store: r.store, date: r.entry_date, repairOrders: r.repair_orders ?? "", hours: r.hours ?? "", labor: r.labor ?? "", parts: r.parts ?? "", laborGross: r.labor_gross ?? "", partsGross: r.parts_gross ?? "" };
        nextEntries[entry.id] = entry;
      });
      setEntries(nextEntries);
      setDataStatus("Live Supabase storage connected. Entries, passwords, and saved monthly totals save across computers.");
      setIsLoading(false);
    }
    loadData();
  }, []);

  const activeLogin = activeLoginKey ? logins[activeLoginKey] : null;
  const selectedMonthKey = date.slice(0, 7);
  const store = stores.includes(selectedStore) ? selectedStore : stores[0];
  const key = `${store}-${date}`;
  const current = entries[key] || blank(store, date);
  const canEditStore = activeLogin?.role === "director" || activeLogin?.store === store;
  const t = timing(date);
  const monthPercent = t.total ? (t.passed / t.total) * 100 : 0;
  const multiplier = t.passed ? t.total / t.passed : 0;
  const visibleRows = useMemo(() => Object.values(entries).filter((r) => r.date?.startsWith(selectedMonthKey)), [entries, selectedMonthKey]);
  const selectedRows = visibleRows.filter((r) => r.store === store);
  const monthRows = monthDates(date).map((d) => entries[`${store}-${d}`] || blank(store, d));
  const daily = totalsOf([current]);
  const selected = totalsOf(selectedRows);
  const monthly = totalsOf(monthRows);
  const group = totalsOf(visibleRows);
  const forecast = { labor: selected.labor * multiplier, parts: selected.parts * multiplier, laborGross: selected.laborGross * multiplier, partsGross: selected.partsGross * multiplier, totalGross: selected.totalGross * multiplier, repairOrders: selected.repairOrders * multiplier, hours: selected.hours * multiplier };
  const forecastTotalSale = forecast.labor + forecast.parts;
  const savedMonthKey = `${store}-${selectedMonthKey}`;
  const savedMonth = monthlySnapshots[savedMonthKey];

  async function saveEntries(next, rowToSave) {
    setEntries(next);
    localStorage.setItem("fixedOpsEntries", JSON.stringify(next));
    if (!supabase || !rowToSave) return;
    const dbRow = { id: `${rowToSave.store}-${rowToSave.date}`, store: rowToSave.store, entry_date: rowToSave.date, repair_orders: toNum(rowToSave.repairOrders), hours: toNum(rowToSave.hours), labor: toNum(rowToSave.labor), parts: toNum(rowToSave.parts), labor_gross: toNum(rowToSave.laborGross), parts_gross: toNum(rowToSave.partsGross), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("daily_entries").upsert(dbRow, { onConflict: "id" });
    if (error) setEntryError(`Supabase save failed: ${error.message}`); else setDataStatus("Saved to Supabase. Other computers can see this entry.");
  }

  function update(field, value) {
    const nextRow = { ...(entries[key] || blank(store, date)), [field]: value };
    if (toNum(nextRow.laborGross) > toNum(nextRow.labor) && toNum(nextRow.labor) > 0) return setEntryError("Labor Gross cannot be higher than Total Labor.");
    if (toNum(nextRow.partsGross) > toNum(nextRow.parts) && toNum(nextRow.parts) > 0) return setEntryError("Parts Gross cannot be higher than Total Parts.");
    setEntryError("");
    saveEntries({ ...entries, [key]: nextRow }, nextRow);
  }

  async function saveDailyEntry() {
    if (!canEditStore) return setEntryError(`Read only: ${activeLogin.name} can view ${store}, but can only save ${activeLogin.store}.`);
    const rowToSave = entries[key] || blank(store, date);
    await saveEntries({ ...entries, [key]: rowToSave }, rowToSave);
    setDataStatus(`Saved daily entry for ${store} on ${fmtDate(date)}.`);
  }

  async function saveMonthlyTotal() {
    if (!canEditStore) return setEntryError(`Read only: ${activeLogin.name} can view ${store}, but can only save ${activeLogin.store}.`);
    const snapshot = { id: `${store}-${selectedMonthKey}`, store, month_key: selectedMonthKey, repair_orders: selected.repairOrders, hours: selected.hours, labor: selected.labor, parts: selected.parts, labor_gross: selected.laborGross, parts_gross: selected.partsGross, total_sale: selected.totalSale, total_gross: selected.totalGross, elr: selected.elr, gross_per_ro: selected.grossPerRo, parts_to_labor: selected.partsToLabor, tracking_total_sale: forecastTotalSale, tracking_total_gross: forecast.totalGross, saved_by: activeLogin?.name || "Unknown", saved_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setMonthlySnapshots((cur) => ({ ...cur, [savedMonthKey]: snapshot }));
    if (!supabase) return setDataStatus("Month totals saved in this canvas browser preview. Live site will save monthly totals in Supabase.");
    const { error } = await supabase.from("monthly_totals").upsert(snapshot, { onConflict: "id" });
    if (error) setEntryError(`Monthly total save failed: ${error.message}`); else setDataStatus(`Saved ${fmtMonth(date)} totals for ${store}.`);
  }

  function handleLogin(e) {
    e.preventDefault();
    const cleanPassword = loginPassword.trim();
    const found = Object.entries(logins).find(([loginKey, account]) => account.username.toLowerCase() === loginUsername.trim().toLowerCase() && (passwords[loginKey] === cleanPassword || account.password === cleanPassword));
    if (!found) return setLoginError("Invalid username or password");
    const [loginKey, account] = found;
    setActiveLoginKey(loginKey);
    setLoginError("");
    if (account.role === "dealer") setSelectedStore(account.store);
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) return setEntryError("Password must be at least 6 characters.");
    const next = { ...passwords, [activeLoginKey]: newPassword };
    setPasswords(next);
    localStorage.setItem("fixedOpsPasswords", JSON.stringify(next));
    setNewPassword("");
    setShowPasswordBox(false);
    if (!supabase) return setEntryError("Password changed for this browser preview. Live site will save changed passwords in Supabase.");
    const account = logins[activeLoginKey];
    const { error } = await supabase.from("user_accounts").upsert({ login_key: activeLoginKey, username: account.username, password: newPassword, name: account.name, role: account.role, store: account.store, updated_at: new Date().toISOString() }, { onConflict: "login_key" });
    if (error) setEntryError(`Password changed in this browser, but Supabase save failed: ${error.message}`); else setEntryError("Password changed and saved live for this login.");
  }

  if (!activeLogin) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950"><Card className="w-full max-w-md p-8"><div className="text-center"><h1 className="text-3xl font-extrabold tracking-tight">Dealer Operating Control Service</h1><p className="mt-2 text-sm text-slate-500">Fixed Ops Daily Tracker login</p></div><form onSubmit={handleLogin} className="mt-8 space-y-4"><div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Username</label><input className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Honda of Pasadena" /></div><div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Password</label><input className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Enter password" /></div>{loginError && <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{loginError}</p>}<button className="h-12 w-full rounded-xl bg-slate-900 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm" type="submit">Login</button></form></Card></div>;
  }

  return <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8"><div className="mx-auto max-w-7xl"><div className="mb-6 text-center"><h2 className="text-4xl font-extrabold tracking-tight">Dealer Operating Control Service</h2></div><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold">Fixed Ops Daily Tracker</h1><p className="text-sm text-slate-500">Daily entry, monthly summary, MTD tracking, and director overview.</p><p className="mt-2 text-sm font-bold text-slate-700">Logged in as: {activeLogin.name}</p></div><div className="flex flex-col items-start gap-3 md:items-end"><div className="rounded-2xl border-2 border-yellow-400 bg-yellow-100 px-6 py-4 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-600">Current Month</p><p className="mt-1 text-3xl font-extrabold text-slate-950">{fmtMonth(date)}</p></div><div className="flex gap-2"><button className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold" onClick={() => setShowPasswordBox(!showPasswordBox)}>Change Password</button><button className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold" onClick={() => setActiveLoginKey(null)}>Logout</button></div></div></div>{showPasswordBox && <Card className="mb-6 p-5"><div className="flex flex-col gap-3 md:flex-row md:items-end"><div className="flex-1"><label className="mb-2 block text-xs font-bold uppercase text-slate-500">New Password</label><input className="h-11 w-full rounded-xl border border-slate-300 px-3" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div><button className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-extrabold uppercase tracking-wide text-white" onClick={changePassword}>Save Password</button></div></Card>}{entryError && <p className="mb-6 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{entryError}</p>}<p className={`mb-6 rounded-xl px-4 py-3 text-sm font-bold ${dataStatus.toLowerCase().includes("failed") || dataStatus.toLowerCase().includes("issue") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{isLoading ? "Loading... " : ""}{dataStatus}</p><Card className="mb-6 p-5"><div className="grid gap-4 md:grid-cols-4"><div className="md:col-span-2"><label className="mb-2 block text-xs font-bold uppercase text-slate-500">Dealership</label><select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3" value={store} onChange={(e) => setSelectedStore(e.target.value)}>{stores.map((s) => <option key={s}>{s}</option>)}</select></div><Stat title="Working Days Passed" value={qty(t.passed)} /><Stat title="Working Days In Month" value={qty(t.total)} /></div><div className="mt-5"><div className="flex justify-between text-sm"><p className="font-semibold">Working Month Progress</p><p>{qty(monthPercent, 1)}% complete · {qty(t.closed)} closed days excluded</p></div><Progress percent={monthPercent} /></div></Card><div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">{[["daily", "DAILY ENTRY"], ["monthly", "MONTHLY SUMMARY"], ["tracking", "MTD & TRACKING"], ["overview", "GROUP OVERVIEW"]].map(([k, label]) => <button key={k} onClick={() => setTab(k)} className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold uppercase tracking-wide ${tab === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{label}</button>)}</div>{tab === "daily" && <DailyTab current={current} date={date} setDate={setDate} update={update} saveDailyEntry={saveDailyEntry} daily={daily} canEditStore={canEditStore} activeLogin={activeLogin} store={store} />}{tab === "monthly" && <MonthlyTab monthRows={monthRows} monthly={monthly} selected={selected} forecast={forecast} multiplier={multiplier} group={group} store={store} date={date} savedMonth={savedMonth} saveMonthlyTotal={saveMonthlyTotal} />}{tab === "tracking" && <TrackingTab selected={selected} forecast={forecast} forecastTotalSale={forecastTotalSale} group={group} monthPercent={monthPercent} store={store} date={date} savedMonth={savedMonth} saveMonthlyTotal={saveMonthlyTotal} />}{tab === "overview" && <OverviewTab stores={stores} visibleRows={visibleRows} group={group} monthPercent={monthPercent} />}</div></div>;
}

function DailyTab({ current, date, setDate, update, saveDailyEntry, daily, canEditStore, activeLogin, store }) {
  return <div className="space-y-6"><Card className="p-5"><div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h2 className="text-xl font-bold">Daily Entry</h2><p className="text-sm text-slate-500">Enter numbers for the prior open business day. Sundays and holidays are skipped automatically.</p>{!canEditStore && <p className="mt-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">Read only: {activeLogin.name} can view {store}, but can only edit {activeLogin.store}.</p>}</div><div><label className="mb-2 block text-xs font-bold uppercase text-slate-500">Prior Business Day Entry Date</label><input className="h-11 rounded-xl border border-slate-300 px-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div></div><div className="mb-5 flex justify-end"><button disabled={!canEditStore} onClick={saveDailyEntry} className={`rounded-xl px-6 py-3 text-sm font-extrabold uppercase tracking-wide shadow-sm ${canEditStore ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}>Save Daily Entry</button></div><div className="grid gap-4 md:grid-cols-3"><Field label="Total Repair Orders" value={current.repairOrders} disabled={!canEditStore} onChange={(v) => update("repairOrders", v)} /><Field label="Total Hours" value={current.hours} disabled={!canEditStore} onChange={(v) => update("hours", v)} /><Field label="Total Labor" value={current.labor} disabled={!canEditStore} onChange={(v) => update("labor", v)} /><Field label="Total Parts" value={current.parts} disabled={!canEditStore} onChange={(v) => update("parts", v)} /><Field label="Total Labor Gross" value={current.laborGross} disabled={!canEditStore} onChange={(v) => update("laborGross", v)} /><Field label="Total Parts Gross" value={current.partsGross} disabled={!canEditStore} onChange={(v) => update("partsGross", v)} /></div></Card><div className="grid gap-4 md:grid-cols-6"><Stat title="Daily ELR" value={money(daily.elr)} sub="Labor ÷ Hours" /><Stat title="Labor Total" value={money(daily.labor)} /><Stat title="Parts Total" value={money(daily.parts)} /><Stat title="Labor Gross" value={money(daily.laborGross)} /><Stat title="Parts Gross" value={money(daily.partsGross)} /><Stat title="Daily Gross" value={money(daily.totalGross)} /></div></div>;
}

function MonthlyTab({ monthRows, monthly, selected, forecast, multiplier, group, store, date, savedMonth, saveMonthlyTotal }) {
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-5"><Stat title="Month ROs" value={qty(monthly.repairOrders)} sub={`Tracking: ${qty(selected.repairOrders * multiplier)}`} /><Stat title="Month Hours" value={qty(monthly.hours, 1)} sub={`Tracking: ${qty(selected.hours * multiplier, 1)}`} /><Stat title="Month Labor" value={money(monthly.labor)} sub={`Tracking: ${money(forecast.labor)}`} /><Stat title="Month Parts" value={money(monthly.parts)} sub={`Tracking: ${money(forecast.parts)}`} /><Stat title="Month ELR" value={money(monthly.elr)} sub={`Group ELR: ${money(group.elr)}`} /></div><Card className="overflow-visible p-0"><div className="sticky top-0 z-30 rounded-t-2xl border-b border-slate-200 bg-white px-5 pb-3 pt-5 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-bold">Monthly Summary — {store}</h2><p className="mt-1 text-sm text-slate-500">{fmtMonth(date)}</p>{savedMonth && <p className="mt-1 text-xs font-bold text-green-700">Saved month total: {new Date(savedMonth.saved_at).toLocaleString()}</p>}</div><button onClick={saveMonthlyTotal} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm">Save Month Totals</button></div></div><div className="px-5 pb-5"><div className="mt-5 max-h-[560px] overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500">{["Date", "Status", "ROs", "Hours", "Labor", "Parts", "Labor Gross", "Parts Gross", "ELR"].map((h) => <th key={h} className="sticky top-0 bg-slate-50 px-3 py-3">{h}</th>)}</tr></thead><tbody>{monthRows.map((row) => { const status = dayStatus(row.date); const rowTotals = totalsOf([row]); return <tr key={row.id} className={`border-b ${row.date === date ? "bg-yellow-100" : status.closed ? "bg-slate-50 text-slate-400" : "bg-white"}`}><td className="px-3 py-3 font-bold">{fmtDate(row.date)}</td><td className="px-3 py-3">{status.reason}</td><td className="px-3 py-3">{qty(row.repairOrders)}</td><td className="px-3 py-3">{qty(row.hours, 1)}</td><td className="px-3 py-3">{money(row.labor)}</td><td className="px-3 py-3">{money(row.parts)}</td><td className="px-3 py-3">{money(row.laborGross)}</td><td className="px-3 py-3">{money(row.partsGross)}</td><td className="px-3 py-3">{money(rowTotals.elr)}</td></tr>; })}</tbody></table></div></div></Card></div>;
}

function TrackingTab({ selected, forecast, forecastTotalSale, group, monthPercent, store, date, savedMonth, saveMonthlyTotal }) {
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-5"><Stat title="MTD Total ROs" value={qty(selected.repairOrders)} /><Stat title="MTD Total Hours" value={qty(selected.hours, 1)} /><Stat title="MTD Total Labor" value={money(selected.labor)} /><Stat title="MTD Total Parts" value={money(selected.parts)} /><Stat title="MTD Gross" value={money(selected.totalGross)} /></div><Card className="p-6"><div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-bold">MTD & Tracking — {store}</h2><p className="text-sm text-slate-500">{fmtMonth(date)} · {qty(monthPercent, 1)}% of working month complete</p></div><div className="flex flex-col gap-3"><div className="rounded-2xl bg-yellow-100 px-6 py-4 text-center ring-2 ring-yellow-400"><p className="text-xs font-bold uppercase text-slate-600">Month End Tracking Parts & Service</p><p className="text-3xl font-extrabold">{money(forecastTotalSale)}</p></div><button onClick={saveMonthlyTotal} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm">Save Month Totals</button>{savedMonth && <p className="text-center text-xs font-bold text-green-700">Last saved: {new Date(savedMonth.saved_at).toLocaleString()}</p>}</div></div><div className="grid gap-4 md:grid-cols-4"><Stat title="Service Tracking" value={money(forecast.labor)} /><Stat title="Parts Tracking" value={money(forecast.parts)} /><Stat title="Tracking Gross" value={money(forecast.totalGross)} /><Stat title="Group Total Sale" value={money(group.totalSale)} /></div></Card></div>;
}

function OverviewTab({ stores, visibleRows, group, monthPercent }) {
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Stat title="Group Repair Orders" value={qty(group.repairOrders)} /><Stat title="Group ELR" value={money(group.elr)} /><Stat title="Group Avg Gross Per RO" value={money(group.grossPerRo)} /><Stat title="Group Avg Parts/Labor" value={`${qty(group.partsToLabor * 100, 1)}%`} /></div><Card className="p-5"><h2 className="mb-4 text-xl font-bold">GROUP OVERVIEW — Store Running Totals</h2><div className="overflow-x-auto"><div className="flex gap-4 pb-2">{stores.map((s) => { const st = totalsOf(visibleRows.filter((r) => r.store === s)); return <Card key={s} className="min-w-[260px] bg-slate-50 p-5 shadow-none"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{s}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">{qty(monthPercent, 1)}% month</span></div><div className="space-y-3 text-sm"><StoreBox label="MTD ROs" value={qty(st.repairOrders)} /><StoreBox label="Hours" value={qty(st.hours, 1)} /><StoreBox label="Labor Sales" value={money(st.labor)} /><StoreBox label="Parts Sales" value={money(st.parts)} /><StoreBox label="Labor Gross" value={money(st.laborGross)} /><StoreBox label="Parts Gross" value={money(st.partsGross)} /><StoreBox label="ELR" value={money(st.elr)} badge={<Badge value={st.elr} benchmark={group.elr} />} /><StoreBox label="Gross Per RO" value={money(st.grossPerRo)} badge={<Badge value={st.grossPerRo} benchmark={group.grossPerRo} />} /><StoreBox label="Parts/Labor" value={`${qty(st.partsToLabor * 100, 1)}%`} badge={<Badge value={st.partsToLabor} benchmark={group.partsToLabor} />} /></div><Progress percent={monthPercent} /></Card>; })}</div></div></Card></div>;
}
function StoreBox({ label, value, sub, badge }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{badge}</div><div className="mt-1 text-xl font-extrabold text-slate-950">{value}</div>{sub && <div className="mt-1 text-xs font-semibold text-slate-500">{sub}</div>}</div>;
}
