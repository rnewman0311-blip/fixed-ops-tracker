import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const STORES = [
  "Honda of Pasadena",
  "CDJR Hyundai Seattle",
  "El Cajon Ford",
  "Brandon Ford",
  "Friendly Ford",
];

const HOLIDAYS = new Set([
  "2026-01-01",
  "2026-05-25",
  "2026-07-04",
  "2026-09-07",
  "2026-11-26",
  "2026-12-25",
]);

const DEFAULT_USERS = {
  richard: { password: "director123", name: "Richard / Director", role: "director", store: "All Stores" },
  pasadena: { password: "pasadena123", name: "Honda of Pasadena Login", role: "dealer", store: "Honda of Pasadena" },
  seattle: { password: "seattle123", name: "CDJR Hyundai Seattle Login", role: "dealer", store: "CDJR Hyundai Seattle" },
  elcajon: { password: "elcajon123", name: "El Cajon Ford Login", role: "dealer", store: "El Cajon Ford" },
  brandon: { password: "brandon123", name: "Brandon Ford Login", role: "dealer", store: "Brandon Ford" },
  friendly: { password: "friendly123", name: "Friendly Ford Login", role: "dealer", store: "Friendly Ford" },
};

const fields = [
  { key: "ros", label: "Repair Orders" },
  { key: "hours", label: "Labor Hours" },
  { key: "labor", label: "Total Labor" },
  { key: "laborGross", label: "Labor Gross" },
  { key: "parts", label: "Total Parts" },
  { key: "partsGross", label: "Parts Gross" },
];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const number = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });

const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isOpenBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && !HOLIDAYS.has(dateKey(date));
}

function priorOpenBusinessDay(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() - 1);
  while (!isOpenBusinessDay(d)) d.setDate(d.getDate() - 1);
  return dateKey(d);
}

function blankStoreData() {
  return STORES.reduce((acc, store) => {
    acc[store] = {};
    return acc;
  }, {});
}

function usersArrayToObject(rows = []) {
  const next = {};
  rows.forEach((u) => {
    if (!u.username) return;
    next[u.username] = {
      password: u.password,
      name: u.name,
      role: u.role,
      store: u.store,
    };
  });
  return Object.keys(next).length ? next : DEFAULT_USERS;
}

function entriesArrayToObject(rows = []) {
  const next = blankStoreData();
  rows.forEach((row) => {
    if (!row.store || !row.entry_date) return;
    if (!next[row.store]) next[row.store] = {};
    next[row.store][row.entry_date] = {
      ros: Number(row.ros || 0),
      hours: Number(row.hours || 0),
      labor: Number(row.labor || 0),
      laborGross: Number(row.labor_gross || 0),
      parts: Number(row.parts || 0),
      partsGross: Number(row.parts_gross || 0),
    };
  });
  return next;
}

export default function App() {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [dailyData, setDailyData] = useState(blankStoreData());
  const [login, setLogin] = useState({ username: "", password: "" });
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("DAILY ENTRY");
  const [selectedStore, setSelectedStore] = useState(STORES[0]);
  const [selectedDate, setSelectedDate] = useState(priorOpenBusinessDay());
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [passwordBox, setPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const visibleStores = STORES;
  const editableStore = user?.role === "director" ? selectedStore : user?.store;
  const canEditStore = (store) => user?.role === "director" || user?.store === store;

  useEffect(() => {
    async function loadCloudData() {
      if (!supabase) {
        setError("Supabase is not connected. Check Vercel environment variables.");
        setLoading(false);
        return;
      }

      try {
        const [usersResult, entriesResult] = await Promise.all([
          supabase.from("dealer_users").select("username,password,name,role,store"),
          supabase.from("daily_entries").select("store,entry_date,ros,hours,labor,labor_gross,parts,parts_gross"),
        ]);

        if (usersResult.error) throw usersResult.error;
        if (entriesResult.error) throw entriesResult.error;

        setUsers(usersArrayToObject(usersResult.data));
        setDailyData(entriesArrayToObject(entriesResult.data));
        setStatus("Cloud save connected.");
      } catch (err) {
        setError(`Supabase load error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadCloudData();
  }, []);

  const savePasswordToCloud = async (username, password) => {
    if (!supabase) throw new Error("Supabase is not connected.");
    const current = users[username];
    const { error: upsertError } = await supabase.from("dealer_users").upsert(
      {
        username,
        password,
        name: current.name,
        role: current.role,
        store: current.store,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "username" }
    );
    if (upsertError) throw upsertError;
  };

  const saveEntryToCloud = async (store, entryDate, entry) => {
    if (!supabase) throw new Error("Supabase is not connected.");
    const { error: upsertError } = await supabase.from("daily_entries").upsert(
      {
        store,
        entry_date: entryDate,
        ros: Number(entry.ros || 0),
        hours: Number(entry.hours || 0),
        labor: Number(entry.labor || 0),
        labor_gross: Number(entry.laborGross || 0),
        parts: Number(entry.parts || 0),
        parts_gross: Number(entry.partsGross || 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store,entry_date" }
    );
    if (upsertError) throw upsertError;
  };

  const handleLogin = () => {
    const username = login.username.trim().toLowerCase();
    const found = users[username];
    if (!found || found.password !== login.password) {
      setError("Login failed. Please check username and password.");
      return;
    }
    setUser({ username, ...found });
    setSelectedStore(found.role === "director" ? STORES[0] : found.store);
    setError("");
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      setError("Password cannot be blank.");
      return;
    }
    try {
      await savePasswordToCloud(user.username, newPassword.trim());
      const next = {
        ...users,
        [user.username]: { ...users[user.username], password: newPassword.trim() },
      };
      setUsers(next);
      setNewPassword("");
      setPasswordBox(false);
      setError("");
      setStatus("Password updated and saved online.");
    } catch (err) {
      setError(`Password save error: ${err.message}`);
    }
  };

  const updateEntry = async (field, value) => {
    const store = editableStore;
    const numeric = Number(value || 0);
    const existing = dailyData[store]?.[selectedDate] || {};
    const proposed = { ...existing, [field]: numeric };

    if (Number(proposed.laborGross || 0) > Number(proposed.labor || 0)) {
      setError("Labor Gross cannot be higher than Total Labor.");
      return;
    }
    if (Number(proposed.partsGross || 0) > Number(proposed.parts || 0)) {
      setError("Parts Gross cannot be higher than Total Parts.");
      return;
    }

    const next = {
      ...dailyData,
      [store]: {
        ...(dailyData[store] || {}),
        [selectedDate]: proposed,
      },
    };
    setDailyData(next);
    setError("");
    setStatus("Saving...");

    try {
      await saveEntryToCloud(store, selectedDate, proposed);
      setStatus("Saved online.");
    } catch (err) {
      setError(`Cloud save error: ${err.message}`);
      setStatus("");
    }
  };

  const totalsByStore = useMemo(() => {
    return STORES.reduce((acc, store) => {
      const entries = Object.values(dailyData[store] || {});
      acc[store] = entries.reduce(
        (t, e) => {
          fields.forEach((f) => (t[f.key] += Number(e[f.key] || 0)));
          return t;
        },
        { ros: 0, hours: 0, labor: 0, laborGross: 0, parts: 0, partsGross: 0 }
      );
      return acc;
    }, {});
  }, [dailyData]);

  const groupTotals = useMemo(() => {
    return STORES.reduce(
      (t, store) => {
        const s = totalsByStore[store];
        fields.forEach((f) => (t[f.key] += Number(s[f.key] || 0)));
        return t;
      },
      { ros: 0, hours: 0, labor: 0, laborGross: 0, parts: 0, partsGross: 0 }
    );
  }, [totalsByStore]);

  const metricCards = (totals) => {
    const totalSales = totals.labor + totals.parts;
    const totalGross = totals.laborGross + totals.partsGross;
    const elr = totals.hours ? totals.labor / totals.hours : 0;
    const grossPerRo = totals.ros ? totalGross / totals.ros : 0;
    const plRatio = totals.labor ? totals.parts / totals.labor : 0;
    const grossPct = totalSales ? (totalGross / totalSales) * 100 : 0;
    return [
      ["Total RO's", number(totals.ros)],
      ["Total Hours", number(totals.hours)],
      ["Total Labor", money(totals.labor)],
      ["Total Parts", money(totals.parts)],
      ["Total Parts and Service", money(totalSales)],
      ["Month End Tracking", money(totalGross)],
      ["ELR", money(elr)],
      ["Gross Per RO", money(grossPerRo)],
      ["Parts-to-Labor Ratio", `${plRatio.toFixed(2)}:1`],
      ["Gross Profit %", pct(grossPct)],
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-slate-200 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Fixed Ops Tracker</h1>
          <p className="text-slate-600 mt-2">Loading cloud data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900">Fixed Ops Tracker</h1>
          <p className="text-slate-600 mt-2">Dealer Operating Control Service</p>
          <div className="mt-6 space-y-4">
            <input className="w-full border rounded-xl p-3" placeholder="Username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} />
            <input className="w-full border rounded-xl p-3" placeholder="Password" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
            {error && <div className="text-red-700 bg-red-50 rounded-xl p-3 text-sm">{error}</div>}
            {status && <div className="text-green-700 bg-green-50 rounded-xl p-3 text-sm">{status}</div>}
            <button className="w-full bg-slate-900 text-white rounded-xl p-3 font-semibold" onClick={handleLogin}>Login</button>
          </div>
          <div className="mt-6 text-xs text-slate-500 leading-6">
            Director demo: richard / director123<br />Dealer demos: pasadena, seattle, elcajon, brandon, friendly / matching password + 123
          </div>
        </div>
      </div>
    );
  }

  const currentEntry = dailyData[editableStore]?.[selectedDate] || {};

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Fixed Ops Tracker</h1>
            <p className="text-slate-600">Logged in as {user.name}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="bg-white border rounded-xl px-4 py-2 shadow-sm" onClick={() => setPasswordBox(!passwordBox)}>Change Password</button>
            <button className="bg-slate-900 text-white rounded-xl px-4 py-2" onClick={() => setUser(null)}>Logout</button>
          </div>
        </div>

        {passwordBox && (
          <div className="bg-white rounded-2xl border p-4 mb-5 shadow-sm flex flex-col md:flex-row gap-3">
            <input className="border rounded-xl p-3 flex-1" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button className="bg-slate-900 text-white rounded-xl px-5" onClick={handlePasswordChange}>Save Password</button>
          </div>
        )}

        {error && <div className="mb-5 text-red-700 bg-red-50 rounded-xl p-3 border border-red-100">{error}</div>}
        {status && <div className="mb-5 text-green-700 bg-green-50 rounded-xl p-3 border border-green-100">{status}</div>}

        <div className="flex flex-wrap gap-2 mb-6">
          {["DAILY ENTRY", "MONTHLY SUMMARY", "MTD & TRACKING", "DIRECTOR OVERVIEW"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-2xl border px-5 py-3 font-bold shadow-sm ${tab === t ? "bg-slate-900 text-white" : "bg-white text-slate-800"}`}>{t}</button>
          ))}
        </div>

        {tab === "DAILY ENTRY" && (
          <div className="bg-white rounded-3xl shadow p-6 border">
            <div className="flex flex-col md:flex-row gap-4 md:items-end mb-6">
              <div className="flex-1">
                <label className="text-sm font-semibold text-slate-600">Store</label>
                <select className="w-full border rounded-xl p-3 mt-1" value={editableStore} disabled={user.role !== "director"} onChange={(e) => setSelectedStore(e.target.value)}>
                  {STORES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-slate-600">Working Day</label>
                <input className="w-full border rounded-xl p-3 mt-1" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Defaults to the previous open business day. Sundays and holidays are skipped.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {fields.map((f) => (
                <div key={f.key} className="rounded-2xl border p-4 bg-yellow-50">
                  <label className="font-bold text-sm text-slate-700">{f.label}</label>
                  <input className="w-full border rounded-xl p-3 mt-2 bg-white" type="number" min="0" value={currentEntry[f.key] ?? ""} disabled={!canEditStore(editableStore)} onChange={(e) => updateEntry(f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "MONTHLY SUMMARY" && (
          <div className="space-y-6">
            {visibleStores.map((store) => (
              <div key={store} className="bg-white rounded-3xl shadow p-6 border">
                <h2 className="text-2xl font-bold mb-4">{store}</h2>
                <div className="grid md:grid-cols-5 gap-4">
                  {metricCards(totalsByStore[store]).slice(0, 5).map(([label, value]) => <Bubble key={label} label={label} value={value} />)}
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  {metricCards(totalsByStore[store]).slice(5, 7).map(([label, value]) => <Bubble key={label} label={label} value={value} large />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "MTD & TRACKING" && (
          <div className="grid lg:grid-cols-2 gap-5">
            {visibleStores.map((store) => {
              const t = totalsByStore[store];
              return (
                <div key={store} className="bg-white rounded-3xl shadow p-6 border">
                  <h2 className="text-2xl font-bold mb-4">{store}</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Service Tracking" value={money(t.laborGross)} />
                    <Stat label="Parts Tracking" value={money(t.partsGross)} />
                    <Stat label="Total ROs" value={number(t.ros)} />
                    <Stat label="Total Hours" value={number(t.hours)} />
                    <Stat label="Total Labor" value={money(t.labor)} />
                    <Stat label="Total Parts" value={money(t.parts)} />
                    <Stat label="Month End Tracking Parts & Service" value={money(t.labor + t.parts)} wide />
                    <Stat label="Tracking Gross End of Month" value={money(t.laborGross + t.partsGross)} wide />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "DIRECTOR OVERVIEW" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow p-6 border">
              <h2 className="text-2xl font-bold mb-4">Group Overview</h2>
              <div className="grid md:grid-cols-5 gap-4">
                {metricCards(groupTotals).slice(0, 5).map(([label, value]) => <Bubble key={label} label={label} value={value} />)}
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Bubble label="Total Parts and Service" value={money(groupTotals.labor + groupTotals.parts)} large />
                <Bubble label="Month End Tracking" value={money(groupTotals.laborGross + groupTotals.partsGross)} large />
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-4 items-stretch">
              {STORES.map((store) => {
                const t = totalsByStore[store];
                return (
                  <div key={store} className="bg-white rounded-3xl shadow p-4 border flex flex-col">
                    <h3 className="font-bold text-lg mb-3 min-h-[56px]">{store}</h3>
                    <div className="space-y-2 text-sm">
                      <Stat label="ROs" value={number(t.ros)} />
                      <Stat label="Hours" value={number(t.hours)} />
                      <Stat label="Group Labor Sale" value={money(t.labor)} />
                      <Stat label="Group Parts Sale" value={money(t.parts)} />
                      <Stat label="Tracking End of Month" value={money(t.labor + t.parts)} />
                      <Stat label="Tracking Gross End of Month" value={money(t.laborGross + t.partsGross)} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-3xl shadow p-6 border">
              <h2 className="text-2xl font-bold mb-4">Parts and Service Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-3">Store</th><th>ROs</th><th>Hours</th><th>Total Labor</th><th>Total Parts</th><th>Gross</th><th>ELR</th><th>Gross %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STORES.map((store) => {
                      const t = totalsByStore[store];
                      const gross = t.laborGross + t.partsGross;
                      const sales = t.labor + t.parts;
                      return (
                        <tr key={store} className="border-b last:border-0">
                          <td className="py-3 font-semibold">{store}</td>
                          <td>{number(t.ros)}</td>
                          <td>{number(t.hours)}</td>
                          <td>{money(t.labor)}</td>
                          <td>{money(t.parts)}</td>
                          <td>{money(gross)}</td>
                          <td>{money(t.hours ? t.labor / t.hours : 0)}</td>
                          <td>{pct(sales ? (gross / sales) * 100 : 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ label, value, large }) {
  return (
    <div className={`rounded-full border bg-slate-50 shadow-sm flex flex-col items-center justify-center text-center p-5 ${large ? "min-h-44" : "min-h-32"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500 font-bold">{label}</div>
      <div className={`${large ? "text-3xl" : "text-2xl"} font-black mt-2`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, wide }) {
  return (
    <div className={`rounded-2xl border bg-slate-50 p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="text-xs text-slate-500 font-bold uppercase">{label}</div>
      <div className="text-lg font-black mt-1">{value}</div>
    </div>
  );
}
