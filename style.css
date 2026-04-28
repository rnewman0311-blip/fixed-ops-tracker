import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
  { key: "ros", db: "ros", label: "Repair Orders" },
  { key: "hours", db: "hours", label: "Labor Hours" },
  { key: "labor", db: "labor", label: "Total Labor" },
  { key: "laborGross", db: "labor_gross", label: "Labor Gross" },
  { key: "parts", db: "parts", label: "Total Parts" },
  { key: "partsGross", db: "parts_gross", label: "Parts Gross" },
];

const money = (n) => Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const number = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function isOpenBusinessDay(date) {
  return date.getDay() !== 0 && !HOLIDAYS.has(dateKey(date));
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

function usersArrayToObject(rows) {
  return rows.reduce((acc, row) => {
    acc[row.username] = { password: row.password, name: row.name, role: row.role, store: row.store };
    return acc;
  }, {});
}

function entriesArrayToObject(rows) {
  const data = blankStoreData();
  rows.forEach((row) => {
    if (!data[row.store]) data[row.store] = {};
    data[row.store][row.entry_date] = {
      ros: Number(row.ros || 0),
      hours: Number(row.hours || 0),
      labor: Number(row.labor || 0),
      laborGross: Number(row.labor_gross || 0),
      parts: Number(row.parts || 0),
      partsGross: Number(row.parts_gross || 0),
    };
  });
  return data;
}

export default function App() {
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [dailyData, setDailyData] = useState(blankStoreData());
  const [login, setLogin] = useState({ username: "", password: "" });
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("DAILY ENTRY");
  const [selectedStore, setSelectedStore] = useState(STORES[0]);
  const [selectedDate, setSelectedDate] = useState(priorOpenBusinessDay());
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordBox, setPasswordBox] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const editableStore = user?.role === "director" ? selectedStore : user?.store;
  const canEditStore = (store) => user?.role === "director" || user?.store === store;

  useEffect(() => {
    async function loadCloudData() {
      if (!supabase) {
        setError("Supabase is not connected. Check Vercel environment variables.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const [userResult, entryResult] = await Promise.all([
        supabase.from("dealer_users").select("*"),
        supabase.from("daily_entries").select("*"),
      ]);
      if (userResult.error) setError(`User load error: ${userResult.error.message}`);
      else if (userResult.data?.length) setUsers(usersArrayToObject(userResult.data));
      if (entryResult.error) setError(`Entry load error: ${entryResult.error.message}`);
      else setDailyData(entriesArrayToObject(entryResult.data || []));
      setLoading(false);
    }
    loadCloudData();
  }, []);

  const handleLogin = () => {
    const username = login.username.trim().toLowerCase();
    const found = users[username];
    if (!found || found.password !== login.password) {
      setError("Login failed. Please check username and password.");
      setNotice("");
      return;
    }
    setUser({ username, ...found });
    setSelectedStore(found.role === "director" ? STORES[0] : found.store);
    setError("");
    setNotice("");
  };

  const handlePasswordChange = async () => {
    if (!newPassword.trim()) {
      setError("Password cannot be blank.");
      return;
    }
    if (!supabase) {
      setError("Supabase is not connected.");
      return;
    }
    const nextPassword = newPassword.trim();
    const { error: updateError } = await supabase
      .from("dealer_users")
      .update({ password: nextPassword })
      .eq("username", user.username);
    if (updateError) {
      setError(`Password update failed: ${updateError.message}`);
      return;
    }
    setUsers((prev) => ({ ...prev, [user.username]: { ...prev[user.username], password: nextPassword } }));
    setNewPassword("");
    setPasswordBox(false);
    setError("");
    setNotice("Password updated and saved online.");
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
      [store]: { ...(dailyData[store] || {}), [selectedDate]: proposed },
    };
    setDailyData(next);
    setError("");
    setNotice("Saving...");
    setSaving(true);

    if (!supabase) {
      setError("Supabase is not connected.");
      setSaving(false);
      return;
    }

    const payload = {
      store,
      entry_date: selectedDate,
      ros: Number(proposed.ros || 0),
      hours: Number(proposed.hours || 0),
      labor: Number(proposed.labor || 0),
      labor_gross: Number(proposed.laborGross || 0),
      parts: Number(proposed.parts || 0),
      parts_gross: Number(proposed.partsGross || 0),
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("daily_entries")
      .upsert(payload, { onConflict: "store,entry_date" });

    setSaving(false);
    if (saveError) {
      setError(`Save failed: ${saveError.message}`);
      setNotice("");
    } else {
      setNotice("Saved online.");
    }
  };

  const totalsByStore = useMemo(() => {
    return STORES.reduce((acc, store) => {
      const entries = Object.values(dailyData[store] || {});
      acc[store] = entries.reduce((t, e) => {
        fields.forEach((f) => (t[f.key] += Number(e[f.key] || 0)));
        return t;
      }, { ros: 0, hours: 0, labor: 0, laborGross: 0, parts: 0, partsGross: 0 });
      return acc;
    }, {});
  }, [dailyData]);

  const groupTotals = useMemo(() => {
    return STORES.reduce((t, store) => {
      const s = totalsByStore[store];
      fields.forEach((f) => (t[f.key] += Number(s[f.key] || 0)));
      return t;
    }, { ros: 0, hours: 0, labor: 0, laborGross: 0, parts: 0, partsGross: 0 });
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

  if (loading) return <div className="loading-screen">Loading Fixed Ops Tracker...</div>;

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Fixed Ops Tracker</h1>
          <p className="subtitle">Dealer Operating Control Service</p>
          <div className="login-fields">
            <input placeholder="Username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} />
            <input placeholder="Password" type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
            {error && <div className="alert error">{error}</div>}
            <button className="primary-btn" onClick={handleLogin}>Login</button>
          </div>
          <div className="demo-note">
            Director demo: richard / director123<br />Dealer demos: pasadena, seattle, elcajon, brandon, friendly / matching password + 123
          </div>
        </div>
      </div>
    );
  }

  const currentEntry = dailyData[editableStore]?.[selectedDate] || {};

  return (
    <div className="app-shell">
      <div className="container">
        <header className="app-header">
          <div>
            <h1>Fixed Ops Tracker</h1>
            <p>Logged in as {user.name}</p>
          </div>
          <div className="header-actions">
            <button className="secondary-btn" onClick={() => setPasswordBox(!passwordBox)}>Change Password</button>
            <button className="primary-btn" onClick={() => setUser(null)}>Logout</button>
          </div>
        </header>

        {passwordBox && (
          <div className="password-panel">
            <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <button className="primary-btn" onClick={handlePasswordChange}>Save Password</button>
          </div>
        )}

        {error && <div className="alert error">{error}</div>}
        {notice && <div className={`alert ${saving ? "info" : "success"}`}>{notice}</div>}

        <nav className="tabs">
          {["DAILY ENTRY", "MONTHLY SUMMARY", "MTD & TRACKING", "DIRECTOR OVERVIEW"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? "active" : ""}>{t}</button>
          ))}
        </nav>

        {tab === "DAILY ENTRY" && (
          <section className="card">
            <div className="entry-controls two-col">
              <div>
                <label>Store</label>
                <select value={editableStore} disabled={user.role !== "director"} onChange={(e) => setSelectedStore(e.target.value)}>
                  {STORES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Working Day</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                <span>Defaults to the previous open business day. Sundays and holidays are skipped.</span>
              </div>
            </div>
            <div className="entry-grid">
              {fields.map((f) => (
                <div key={f.key} className="entry-field">
                  <label>{f.label}</label>
                  <input type="number" min="0" value={currentEntry[f.key] ?? ""} disabled={!canEditStore(editableStore)} onChange={(e) => updateEntry(f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "MONTHLY SUMMARY" && (
          <div className="stack">
            {STORES.map((store) => (
              <section key={store} className="card dealer-card">
                <h2>{store}</h2>
                <div className="bubble-grid five">
                  {metricCards(totalsByStore[store]).slice(0, 5).map(([label, value]) => <Bubble key={label} label={label} value={value} />)}
                </div>
                <div className="bubble-grid two">
                  {metricCards(totalsByStore[store]).slice(5, 7).map(([label, value]) => <Bubble key={label} label={label} value={value} large />)}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "MTD & TRACKING" && (
          <div className="two-col">
            {STORES.map((store) => {
              const t = totalsByStore[store];
              return (
                <section key={store} className="card dealer-card">
                  <h2>{store}</h2>
                  <div className="stat-grid">
                    <Stat label="Service Tracking" value={money(t.laborGross)} />
                    <Stat label="Parts Tracking" value={money(t.partsGross)} />
                    <Stat label="Total ROs" value={number(t.ros)} />
                    <Stat label="Total Hours" value={number(t.hours)} />
                    <Stat label="Total Labor" value={money(t.labor)} />
                    <Stat label="Total Parts" value={money(t.parts)} />
                    <Stat label="Month End Tracking Parts & Service" value={money(t.labor + t.parts)} wide />
                    <Stat label="Tracking Gross End of Month" value={money(t.laborGross + t.partsGross)} wide />
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {tab === "DIRECTOR OVERVIEW" && (
          <div className="stack">
            <section className="card dealer-card">
              <h2>Group Overview</h2>
              <div className="bubble-grid five">
                {metricCards(groupTotals).slice(0, 5).map(([label, value]) => <Bubble key={label} label={label} value={value} />)}
              </div>
              <div className="bubble-grid two">
                <Bubble label="Total Parts and Service" value={money(groupTotals.labor + groupTotals.parts)} large />
                <Bubble label="Month End Tracking" value={money(groupTotals.laborGross + groupTotals.partsGross)} large />
              </div>
            </section>

            <div className="dealer-row">
              {STORES.map((store) => {
                const t = totalsByStore[store];
                return (
                  <section key={store} className="card dealer-column">
                    <h3>{store}</h3>
                    <Stat label="ROs" value={number(t.ros)} />
                    <Stat label="Hours" value={number(t.hours)} />
                    <Stat label="Group Labor Sale" value={money(t.labor)} />
                    <Stat label="Group Parts Sale" value={money(t.parts)} />
                    <Stat label="Tracking End of Month" value={money(t.labor + t.parts)} />
                    <Stat label="Tracking Gross End of Month" value={money(t.laborGross + t.partsGross)} />
                  </section>
                );
              })}
            </div>

            <section className="card dealer-card">
              <h2>Parts and Service Summary</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Store</th><th>ROs</th><th>Hours</th><th>Total Labor</th><th>Total Parts</th><th>Gross</th><th>ELR</th><th>Gross %</th></tr>
                  </thead>
                  <tbody>
                    {STORES.map((store) => {
                      const t = totalsByStore[store];
                      const gross = t.laborGross + t.partsGross;
                      const sales = t.labor + t.parts;
                      return (
                        <tr key={store}>
                          <td>{store}</td><td>{number(t.ros)}</td><td>{number(t.hours)}</td><td>{money(t.labor)}</td><td>{money(t.parts)}</td><td>{money(gross)}</td><td>{money(t.hours ? t.labor / t.hours : 0)}</td><td>{pct(sales ? (gross / sales) * 100 : 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ label, value, large }) {
  return (
    <div className={`bubble ${large ? "large" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Stat({ label, value, wide }) {
  return (
    <div className={`stat ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
