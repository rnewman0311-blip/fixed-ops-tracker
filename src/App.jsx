import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const viteEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL;
const supabaseKey = viteEnv.VITE_SUPABASE_ANON_KEY || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
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
const monthKeyOf = (dateString) => dateString.slice(0, 7);
const toNum = (value) => Number(String(value ?? "").replace(/[$,]/g, "")) || 0;
const trunc = (value, digits = 2) => Math.trunc(Number(value || 0) * 10 ** digits) / 10 ** digits;
const money = (value, digits = 2) =>
  trunc(value, digits).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
const qty = (value, digits = 0) =>
  trunc(value, digits).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const fixedHoliday = (year, month, day) => dateKey(new Date(year, month, day, 12, 0, 0));
const nthWeekday = (year, month, weekday, nth) => {
  const first = new Date(year, month, 1, 12, 0, 0);
  const offset = (weekday - first.getDay() + 7) % 7;
  return dateKey(new Date(year, month, 1 + offset + (nth - 1) * 7, 12, 0, 0));
};
const lastWeekday = (year, month, weekday) => {
  const last = new Date(year, month + 1, 0, 12, 0, 0);
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
  return Array.from({ length: days }, (_, i) => dateKey(new Date(d.getFullYear(), d.getMonth(), i + 1, 12, 0, 0)));
};
const timing = (dateString) => {
  const selected = new Date(`${dateString}T12:00:00`);
  const dates = monthDates(dateString);
  const open = dates.filter((d) => !dayStatus(d).closed);
  const passed = open.filter((d) => new Date(`${d}T12:00:00`) <= selected);
  return { passed: passed.length, total: open.length, closed: dates.length - open.length };
};
const fmtDate = (dateString) => new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtMonth = (dateString) => new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const blank = (store, date) => ({
  id: `${store}-${date}`, store, date,
  repairOrders: "", hours: "", labor: "", parts: "", laborGross: "", partsGross: "",
});

const totalsOf = (rows) => {
  const totals = rows.reduce((acc, row) => {
    acc.repairOrders += toNum(row.repairOrders);
    acc.hours += toNum(row.hours);
    acc.labor += toNum(row.labor);
    acc.parts += toNum(row.parts);
    acc.laborGross += toNum(row.laborGross);
    acc.partsGross += toNum(row.partsGross);
    return acc;
  }, { repairOrders: 0, hours: 0, labor: 0, parts: 0, laborGross: 0, partsGross: 0 });
  totals.totalSale = totals.labor + totals.parts;
  totals.totalGross = totals.laborGross + totals.partsGross;
  totals.elr = totals.hours > 0 ? totals.labor / totals.hours : 0;
  totals.partsToLabor = totals.labor > 0 ? totals.parts / totals.labor : 0;
  totals.grossPerRo = totals.repairOrders > 0 ? totals.totalGross / totals.repairOrders : 0;
  return totals;
};

const emptyMonthData = (baseDate = today()) => {
  const seed = {};
  const dates = monthDates(baseDate);
  stores.forEach((store) => dates.forEach((date) => { seed[`${store}-${date}`] = blank(store, date); }));
  return seed;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
function Stat({ title, value, sub, children, className = "" }) {
  return <Card className={`p-5 text-center ${className}`}><p className="text-base font-semibold text-slate-500">{title}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>{sub && <p className="mt-2 text-sm text-slate-500">{sub}</p>}{children}</Card>;
}
function Badge({ value, benchmark }) {
  const below = Number(value || 0) < Number(benchmark || 0);
  return <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${below ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{below ? "↓ Below Avg" : "↑ At/Above Avg"}</span>;
}
function Progress({ percent }) {
  const p = Math.min(100, Math.max(0, percent));
  return <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-900" style={{ width: `${p}%` }} /></div>;
}
function Field({ label, value, onChange, disabled = false }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input className={`h-12 w-full rounded-xl border-2 px-3 text-lg outline-none ${disabled ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed" : "border-yellow-400 bg-yellow-100 focus:border-yellow-600"}`} type="number" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder="0" />
    </div>
  );
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
    try { return JSON.parse(localStorage.getItem("fixedOpsEntries") || "null") || emptyMonthData(); }
    catch { return emptyMonthData(); }
  });
  const [entryError, setEntryError] = useState("");
  const [dataStatus, setDataStatus] = useState(supabase ? "Connecting to Supabase..." : "Canvas preview uses browser storage. Live Vercel site will use Supabase.");
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [passwords, setPasswords] = useState(() => {
    try { return { ...Object.fromEntries(Object.entries(logins).map(([k, v]) => [k, v.password])), ...JSON.parse(localStorage.getItem("fixedOpsPasswords") || "{}") }; }
    catch { return Object.fromEntries(Object.entries(logins).map(([k, v]) => [k, v.password])); }
  });
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [monthlySnapshots, setMonthlySnapshots] = useState({});

  useEffect(() => {
    async function loadSupabaseData() {
      if (!supabase) return;
      setIsLoadingEntries(true);
      setDataStatus("Loading live Supabase data...");

      const [{ data: entryRows, error: entryErrorResult }, { data: userRows, error: userErrorResult }, { data: savedMonthRows, error: savedMonthError }] = await Promise.all([
        supabase.from("daily_entries").select("*").order("entry_date", { ascending: true }),
        supabase.from("user_accounts").select("*"),
        supabase.from("monthly_totals").select("*").order("month_key", { ascending: false })
      ]);

      if (userErrorResult) {
        setDataStatus(`Supabase users table issue: ${userErrorResult.message}`);
      } else if (userRows?.length) {
        const nextPasswords = { ...Object.fromEntries(Object.entries(logins).map(([k, v]) => [k, v.password])) };
        userRows.forEach((userRow) => { if (userRow.login_key && userRow.password) nextPasswords[userRow.login_key] = userRow.password; });
        setPasswords(nextPasswords);
        localStorage.setItem("fixedOpsPasswords", JSON.stringify(nextPasswords));
      }

      if (savedMonthError) {
        setDataStatus(`Supabase monthly totals table issue: ${savedMonthError.message}`);
      } else if (savedMonthRows?.length) {
        const nextSnapshots = {};
        savedMonthRows.forEach((row) => { nextSnapshots[`${row.store}-${row.month_key}`] = row; });
        setMonthlySnapshots(nextSnapshots);
      }

      if (entryErrorResult) {
        setDataStatus(`Supabase entries table issue: ${entryErrorResult.message}`);
        setIsLoadingEntries(false);
        return;
      }

      const nextEntries = emptyMonthData(date);
      entryRows?.forEach((row) => {
        const entry = {
          id: row.id || `${row.store}-${row.entry_date}`,
          store: row.store,
          date: row.entry_date,
          repairOrders: row.repair_orders ?? "",
          hours: row.hours ?? "",
          labor: row.labor ?? "",
          parts: row.parts ?? "",
          laborGross: row.labor_gross ?? "",
          partsGross: row.parts_gross ?? "",
        };
        nextEntries[entry.id] = entry;
      });
      setEntries(nextEntries);
      localStorage.setItem("fixedOpsEntries", JSON.stringify(nextEntries));
      setDataStatus("Live Supabase storage connected. Entries, passwords, and saved month totals save across computers.");
      setIsLoadingEntries(false);
    }
    loadSupabaseData();
  }, []);

  const activeLogin = activeLoginKey ? logins[activeLoginKey] : null;
  const selectedMonthKey = monthKeyOf(date);
  const allowedStores = stores;
  const store = allowedStores.includes(selectedStore) ? selectedStore : allowedStores[0];
  const canEditStore = activeLogin?.role === "director" || activeLogin?.store === store;
  const key = `${store}-${date}`;
  const current = entries[key] || blank(store, date);
  const t = timing(date);
  const monthPercent = t.total > 0 ? (t.passed / t.total) * 100 : 0;
  const multiplier = t.passed > 0 ? t.total / t.passed : 0;

  const allRows = useMemo(() => Object.values(entries), [entries]);
  const visibleRows = allRows.filter((row) => row.date?.startsWith(selectedMonthKey));
  const selectedRows = visibleRows.filter((row) => row.store === store);
  const monthRows = monthDates(date).map((d) => entries[`${store}-${d}`] || blank(store, d));

  const daily = totalsOf([current]);
  const selected = totalsOf(selectedRows);
  const monthly = totalsOf(monthRows);
  const group = totalsOf(visibleRows);

  const forecast = {
    labor: selected.labor * multiplier,
    parts: selected.parts * multiplier,
    laborGross: selected.laborGross * multiplier,
    partsGross: selected.partsGross * multiplier,
    totalGross: selected.totalGross * multiplier,
    repairOrders: selected.repairOrders * multiplier,
    hours: selected.hours * multiplier,
  };

  const forecastTotalSale = forecast.labor + forecast.parts;
  const groupLaborForecast = group.labor * multiplier;
  const groupPartsForecast = group.parts * multiplier;
  const groupLaborGrossForecast = group.laborGross * multiplier;
  const groupPartsGrossForecast = group.partsGross * multiplier;
  const groupSaleForecast = group.totalSale * multiplier;
  const groupGrossForecast = group.totalGross * multiplier;
  const groupLaborGrossPct = group.labor > 0 ? (group.laborGross / group.labor) * 100 : 0;
  const groupPartsGrossPct = group.parts > 0 ? (group.partsGross / group.parts) * 100 : 0;
  const savedMonthKey = `${store}-${selectedMonthKey}`;
  const savedMonth = monthlySnapshots[savedMonthKey];

  const saveEntries = async (next, rowToSave = null) => {
    setEntries(next);
    localStorage.setItem("fixedOpsEntries", JSON.stringify(next));
    if (!supabase || !rowToSave) return;

    setDataStatus("Saving daily entry to Supabase...");
    const dbRow = {
      id: `${rowToSave.store}-${rowToSave.date}`,
      store: rowToSave.store,
      entry_date: rowToSave.date,
      repair_orders: toNum(rowToSave.repairOrders),
      hours: toNum(rowToSave.hours),
      labor: toNum(rowToSave.labor),
      parts: toNum(rowToSave.parts),
      labor_gross: toNum(rowToSave.laborGross),
      parts_gross: toNum(rowToSave.partsGross),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("daily_entries").upsert(dbRow, { onConflict: "id" });
    if (error) {
      setEntryError(`Supabase save failed: ${error.message}`);
      setDataStatus("Save failed. Entry is still saved in this browser.");
      return;
    }
    setDataStatus("Saved to Supabase. Other computers can see this entry.");
  };

  const saveMonthlyTotal = async () => {
    if (!canEditStore) {
      setEntryError(`Read only: ${activeLogin.name} can view ${store}, but can only save ${activeLogin.store}.`);
      return;
    }
    const snapshot = {
      id: `${store}-${selectedMonthKey}`,
      store,
      month_key: selectedMonthKey,
      repair_orders: selected.repairOrders,
      hours: selected.hours,
      labor: selected.labor,
      parts: selected.parts,
      labor_gross: selected.laborGross,
      parts_gross: selected.partsGross,
      total_sale: selected.totalSale,
      total_gross: selected.totalGross,
      elr: selected.elr,
      gross_per_ro: selected.grossPerRo,
      parts_to_labor: selected.partsToLabor,
      tracking_total_sale: forecastTotalSale,
      tracking_total_gross: forecast.totalGross,
      saved_by: activeLogin?.name || "Unknown",
      saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMonthlySnapshots((currentSnapshots) => ({ ...currentSnapshots, [savedMonthKey]: snapshot }));
    if (!supabase) {
      setDataStatus("Month totals saved in this canvas browser preview. Live site will save monthly totals in Supabase.");
      return;
    }
    setDataStatus("Saving month totals to Supabase...");
    const { error } = await supabase.from("monthly_totals").upsert(snapshot, { onConflict: "id" });
    if (error) {
      setEntryError(`Monthly total save failed: ${error.message}`);
      setDataStatus("Month total save failed.");
      return;
    }
    setEntryError("");
    setDataStatus(`Saved ${fmtMonth(date)} totals for ${store}.`);
  };

  const update = (field, value) => {
    const nextRow = { ...(entries[key] || blank(store, date)), [field]: value };
    if (toNum(nextRow.laborGross) > toNum(nextRow.labor) && toNum(nextRow.labor) > 0) {
      setEntryError("Labor Gross cannot be higher than Total Labor.");
      return;
    }
    if (toNum(nextRow.partsGross) > toNum(nextRow.parts) && toNum(nextRow.parts) > 0) {
      setEntryError("Parts Gross cannot be higher than Total Parts.");
      return;
    }
    setEntryError("");
    saveEntries({ ...entries, [key]: nextRow }, nextRow);
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const found = Object.entries(logins).find(
      ([loginKey, account]) => account.username.toLowerCase() === loginUsername.trim().toLowerCase() && passwords[loginKey] === loginPassword
    );
    if (!found) {
      setLoginError("Invalid username or password");
      return;
    }
    const [loginKey, account] = found;
    setActiveLoginKey(loginKey);
    setLoginError("");
    if (account.role === "dealer") setSelectedStore(account.store);
  };

  const logout = () => {
    setActiveLoginKey(null);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setEntryError("Password must be at least 6 characters.");
      return;
    }
    const next = { ...passwords, [activeLoginKey]: newPassword };
    setPasswords(next);
    localStorage.setItem("fixedOpsPasswords", JSON.stringify(next));
    setNewPassword("");
    setShowPasswordBox(false);

    if (supabase) {
      setDataStatus("Saving changed password to Supabase...");
      const account = logins[activeLoginKey];
      const { error } = await supabase.from("user_accounts").upsert({
        login_key: activeLoginKey, username: account.username, password: newPassword, name: account.name,
        role: account.role, store: account.store, updated_at: new Date().toISOString(),
      }, { onConflict: "login_key" });
      if (error) {
        setEntryError(`Password changed in this browser, but Supabase save failed: ${error.message}`);
        return;
      }
      setEntryError("Password changed and saved live for this login.");
      setDataStatus("Password saved to Supabase.");
      return;
    }
    setEntryError("Password changed for this browser preview. Live site will save changed passwords in Supabase.");
  };

  if (!activeLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-950">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">Dealer Operating Control Service</h1>
            <p className="mt-2 text-sm text-slate-500">Fixed Ops Daily Tracker login</p>
          </div>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Username</label>
              <input className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="Honda of Pasadena" />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Password</label>
              <input className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Enter password" />
            </div>
            {loginError && <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{loginError}</p>}
            <button className="h-12 w-full rounded-xl bg-slate-900 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm" type="submit">Login</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center"><h2 className="text-4xl font-extrabold tracking-tight">Dealer Operating Control Service</h2></div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fixed Ops Daily Tracker</h1>
            <p className="text-sm text-slate-500">Daily entry, monthly summary, MTD tracking, and director overview.</p>
            <p className="mt-2 text-sm font-bold text-slate-700">Logged in as: {activeLogin.name}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="rounded-2xl border-2 border-yellow-400 bg-yellow-100 px-6 py-4 text-center shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Current Month</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-950">{fmtMonth(date)}</p>
            </div>
            <div className="flex gap-2">
              <button className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => setShowPasswordBox(!showPasswordBox)}>Change Password</button>
              <button className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>

        {showPasswordBox && (
          <Card className="mb-6 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">New Password</label>
                <input className="h-11 w-full rounded-xl border border-slate-300 px-3" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <button className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-extrabold uppercase tracking-wide text-white" onClick={changePassword}>Save Password</button>
            </div>
          </Card>
        )}

        {entryError && <p className="mb-6 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{entryError}</p>}
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm font-bold ${dataStatus.toLowerCase().includes("failed") || dataStatus.toLowerCase().includes("issue") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{isLoadingEntries ? "Loading... " : ""}{dataStatus}</p>

        <Card className="mb-6 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Dealership</label>
              <select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3" value={store} onChange={(event) => setSelectedStore(event.target.value)}>
                {allowedStores.map((storeName) => <option key={storeName}>{storeName}</option>)}
              </select>
            </div>
            <Stat title="Working Days Passed" value={qty(t.passed)} />
            <Stat title="Working Days In Month" value={qty(t.total)} />
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-sm"><p className="font-semibold">Working Month Progress</p><p>{qty(monthPercent, 1)}% complete · {qty(t.closed)} closed days excluded</p></div>
            <Progress percent={monthPercent} />
          </div>
        </Card>

        <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
          {[["daily", "DAILY ENTRY"], ["weekly", "MONTHLY SUMMARY"], ["forecast", "MTD & TRACKING"], ["director", "GROUP OVERVIEW"]].map(([tabKey, label]) => (
            <button key={tabKey} onClick={() => setTab(tabKey)} className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold uppercase tracking-wide shadow-sm transition ${tab === tabKey ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white"}`}>{label}</button>
          ))}
        </div>

        {tab === "daily" && <DailyTab current={current} date={date} setDate={setDate} update={update} daily={daily} canEditStore={canEditStore} activeLogin={activeLogin} store={store} />}
        {tab === "weekly" && <MonthlyTab monthRows={monthRows} monthly={monthly} selected={selected} forecast={forecast} multiplier={multiplier} group={group} store={store} date={date} savedMonth={savedMonth} saveMonthlyTotal={saveMonthlyTotal} />}
        {tab === "forecast" && <ForecastTab selected={selected} forecast={forecast} forecastTotalSale={forecastTotalSale} group={group} monthPercent={monthPercent} store={store} date={date} savedMonth={savedMonth} saveMonthlyTotal={saveMonthlyTotal} />}
        {tab === "director" && <DirectorTab allowedStores={allowedStores} stores={stores} visibleRows={visibleRows} group={group} monthPercent={monthPercent} groupLaborForecast={groupLaborForecast} groupPartsForecast={groupPartsForecast} groupLaborGrossForecast={groupLaborGrossForecast} groupPartsGrossForecast={groupPartsGrossForecast} groupSaleForecast={groupSaleForecast} groupGrossForecast={groupGrossForecast} groupLaborGrossPct={groupLaborGrossPct} groupPartsGrossPct={groupPartsGrossPct} />}
      </div>
    </div>
  );
}

function DailyTab({ current, date, setDate, update, daily, canEditStore, activeLogin, store }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Daily Entry</h2>
            <p className="text-sm text-slate-500">Enter numbers for the prior open business day. Sundays and holidays are skipped automatically.</p>
            {!canEditStore && <p className="mt-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">Read only: {activeLogin.name} can view {store}, but can only edit {activeLogin.store}.</p>}
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Prior Business Day Entry Date</label>
            <input className="h-11 rounded-xl border border-slate-300 px-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Total Repair Orders" value={current.repairOrders} disabled={!canEditStore} onChange={(value) => update("repairOrders", value)} />
          <Field label="Total Hours" value={current.hours} disabled={!canEditStore} onChange={(value) => update("hours", value)} />
          <Field label="Total Labor" value={current.labor} disabled={!canEditStore} onChange={(value) => update("labor", value)} />
          <Field label="Total Parts" value={current.parts} disabled={!canEditStore} onChange={(value) => update("parts", value)} />
          <Field label="Total Labor Gross" value={current.laborGross} disabled={!canEditStore} onChange={(value) => update("laborGross", value)} />
          <Field label="Total Parts Gross" value={current.partsGross} disabled={!canEditStore} onChange={(value) => update("partsGross", value)} />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-6">
        <Stat title="Daily ELR" value={money(daily.elr)} sub="Labor ÷ Hours" />
        <Stat title="Labor Total" value={money(daily.labor)} />
        <Stat title="Parts Total" value={money(daily.parts)} />
        <Stat title="Labor Gross" value={money(daily.laborGross)} />
        <Stat title="Parts Gross" value={money(daily.partsGross)} />
        <Stat title="Daily Gross" value={money(daily.totalGross)} />
      </div>
    </div>
  );
}

function MonthlyTab({ monthRows, monthly, selected, forecast, multiplier, group, store, date, savedMonth, saveMonthlyTotal }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Stat title="Month ROs" value={qty(monthly.repairOrders)} sub={`Tracking: ${qty(selected.repairOrders * multiplier)}`} />
        <Stat title="Month Hours" value={qty(monthly.hours, 1)} sub={`Tracking: ${qty(selected.hours * multiplier, 1)}`} />
        <Stat title="Month Labor" value={money(monthly.labor)} sub={`Tracking: ${money(forecast.labor)}`} />
        <Stat title="Month Parts" value={money(monthly.parts)} sub={`Tracking: ${money(forecast.parts)}`} />
        <Stat title="Month ELR" value={money(monthly.elr)} sub={`Group ELR: ${money(group.elr)}`}><Badge value={monthly.elr} benchmark={group.elr} /></Stat>
      </div>
      <Card className="overflow-visible p-0">
        <div className="sticky top-0 z-30 rounded-t-2xl border-b border-slate-200 bg-white px-5 pb-3 pt-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Monthly Summary — {store}</h2>
              <p className="mt-1 text-sm text-slate-500">{fmtMonth(date)}</p>
              {savedMonth && <p className="mt-1 text-xs font-bold text-green-700">Saved month total: {new Date(savedMonth.saved_at).toLocaleString()}</p>}
            </div>
            <button onClick={saveMonthlyTotal} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm">Save Month Totals</button>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="mt-5 max-h-[560px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-slate-500">{["Date", "Status", "ROs", "Hours", "Labor", "Parts", "Labor Gross", "Parts Gross", "ELR"].map((h) => <th key={h} className="sticky top-0 bg-slate-50 px-3 py-3">{h}</th>)}</tr></thead>
              <tbody>{monthRows.map((row) => {
                const rowTotals = totalsOf([row]);
                const status = dayStatus(row.date);
                return <tr key={row.id} className={`border-b ${row.date === date ? "bg-yellow-100" : status.closed ? "bg-slate-50 text-slate-400" : "bg-white"}`}><td className="px-3 py-3 font-bold">{fmtDate(row.date)}</td><td className="px-3 py-3">{status.reason}</td><td className="px-3 py-3">{qty(row.repairOrders)}</td><td className="px-3 py-3">{qty(row.hours, 1)}</td><td className="px-3 py-3">{money(row.labor)}</td><td className="px-3 py-3">{money(row.parts)}</td><td className="px-3 py-3">{money(row.laborGross)}</td><td className="px-3 py-3">{money(row.partsGross)}</td><td className="px-3 py-3">{money(rowTotals.elr)}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ForecastTab({ selected, forecast, forecastTotalSale, group, monthPercent, store, date, savedMonth, saveMonthlyTotal }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Stat title="MTD Total ROs" value={qty(selected.repairOrders)} />
        <Stat title="MTD Total Hours" value={qty(selected.hours, 1)} />
        <Stat title="MTD Total Labor" value={money(selected.labor)} />
        <Stat title="MTD Total Parts" value={money(selected.parts)} />
        <Stat title="MTD Gross" value={money(selected.totalGross)} />
      </div>
      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-2xl font-bold">MTD & Tracking — {store}</h2><p className="text-sm text-slate-500">{fmtMonth(date)} · {qty(monthPercent, 1)}% of working month complete</p></div>
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-yellow-100 px-6 py-4 text-center ring-2 ring-yellow-400"><p className="text-xs font-bold uppercase text-slate-600">Month End Tracking Parts & Service</p><p className="text-3xl font-extrabold">{money(forecastTotalSale)}</p></div>
            <button onClick={saveMonthlyTotal} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm">Save Month Totals</button>
            {savedMonth && <p className="text-center text-xs font-bold text-green-700">Last saved: {new Date(savedMonth.saved_at).toLocaleString()}</p>}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat title="Service Tracking" value={money(forecast.labor)} />
          <Stat title="Parts Tracking" value={money(forecast.parts)} />
          <Stat title="Tracking Gross" value={money(forecast.totalGross)} />
          <Stat title="Group Total Sale" value={money(group.totalSale)} />
        </div>
      </Card>
    </div>
  );
}

function DirectorTab({ allowedStores, stores, visibleRows, group, monthPercent, groupLaborForecast, groupPartsForecast, groupLaborGrossForecast, groupPartsGrossForecast, groupSaleForecast, groupGrossForecast, groupLaborGrossPct, groupPartsGrossPct }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Group Repair Orders" value={qty(group.repairOrders)} />
        <Stat title="Group ELR" value={money(group.elr)} />
        <Stat title="Group Avg Gross Per RO" value={money(group.grossPerRo)} />
        <Stat title="Group Avg Parts/Labor" value={`${qty(group.partsToLabor * 100, 1)}%`} sub="Parts sale ÷ labor sale" />
        <Stat title="Group Labor Sale" value={money(group.labor)} sub={`Tracking: ${money(groupLaborForecast)}`} />
        <Stat title="Group Labor Gross" value={money(group.laborGross)} sub={`Tracking: ${money(groupLaborGrossForecast)}`}><p className="mt-2 text-sm font-semibold text-slate-500">Gross Profit %: {qty(groupLaborGrossPct, 2)}%</p></Stat>
        <div className="md:col-span-2 md:row-span-2">
          <Card className="h-full p-8"><div className="flex h-full min-h-[330px] flex-col items-center justify-center text-center"><p className="text-xl font-bold text-slate-500">Parts and Service Summary</p><div className="mt-6 w-full space-y-5 rounded-2xl bg-slate-100 px-6 py-6"><SummaryLine label="Total Sale" value={money(group.totalSale)} /><SummaryLine label="Total Gross" value={money(group.totalGross)} /><SummaryLine label="Tracking End of Month" value={money(groupSaleForecast)} /><SummaryLine label="Tracking Gross End of Month" value={money(groupGrossForecast)} /></div></div></Card>
        </div>
        <Stat title="Group Parts Sale" value={money(group.parts)} sub={`Tracking: ${money(groupPartsForecast)}`} />
        <Stat title="Group Parts Gross" value={money(group.partsGross)} sub={`Tracking: ${money(groupPartsGrossForecast)}`}><p className="mt-2 text-sm font-semibold text-slate-500">Gross Profit %: {qty(groupPartsGrossPct, 2)}%</p></Stat>
      </div>
      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">GROUP OVERVIEW — Store Running Totals</h2>
        <p className="mb-4 text-sm text-slate-500">Dealers are shown side by side in their own boxes so each store can compare performance against the group.</p>
        <div className="overflow-x-auto"><div className="flex gap-4 pb-2">
          {stores.filter((storeName) => allowedStores.includes(storeName)).map((storeName) => {
            const storeTotals = totalsOf(visibleRows.filter((row) => row.store === storeName));
            return <Card key={storeName} className="min-w-[260px] bg-slate-50 p-5 shadow-none"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{storeName}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">{qty(monthPercent, 1)}% month</span></div><div className="space-y-3 text-sm"><StoreBox label="MTD ROs" value={qty(storeTotals.repairOrders)} /><StoreBox label="Hours" value={qty(storeTotals.hours, 1)} /><StoreBox label="Labor Sales" value={money(storeTotals.labor)} /><StoreBox label="Parts Sales" value={money(storeTotals.parts)} /><StoreBox label="Labor Gross" value={money(storeTotals.laborGross)} /><StoreBox label="Parts Gross" value={money(storeTotals.partsGross)} /><StoreBox label="ELR" value={money(storeTotals.elr)} badge={<Badge value={storeTotals.elr} benchmark={group.elr} />} sub={`Group ELR: ${money(group.elr)}`} /><StoreBox label="Gross Per RO" value={money(storeTotals.grossPerRo)} badge={<Badge value={storeTotals.grossPerRo} benchmark={group.grossPerRo} />} sub={`Group Avg: ${money(group.grossPerRo)}`} /><StoreBox label="Parts/Labor" value={`${qty(storeTotals.partsToLabor * 100, 1)}%`} badge={<Badge value={storeTotals.partsToLabor} benchmark={group.partsToLabor} />} sub={`Group Avg: ${qty(group.partsToLabor * 100, 1)}%`} /><StoreBox label="Month Progress" value={`${qty(monthPercent, 1)}%`} /></div><Progress percent={monthPercent} /></Card>;
          })}
        </div></div>
      </Card>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0"><span className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</span><span className="text-2xl font-extrabold text-slate-950">{value}</span></div>;
}
function StoreBox({ label, value, sub, badge }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{badge}</div><div className="mt-1 text-xl font-extrabold text-slate-950">{value}</div>{sub && <div className="mt-1 text-xs font-semibold text-slate-500">{sub}</div>}</div>;
}
