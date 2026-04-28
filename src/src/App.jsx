import React, { useMemo, useState } from "react";

const stores = ["Honda of Pasadena", "CDJR Hyundai Seattle", "El Cajon Ford", "Brandon Ford", "Friendly Ford"];

const logins = {
  director: { name: "Richard / Director", username: "richard", password: "director123", role: "director", store: "All Stores" },
  pasadena: { name: "Honda of Pasadena Login", username: "pasadena", password: "pasadena123", role: "dealer", store: "Honda of Pasadena" },
  seattle: { name: "CDJR Hyundai Seattle Login", username: "seattle", password: "seattle123", role: "dealer", store: "CDJR Hyundai Seattle" },
  elcajon: { name: "El Cajon Ford Login", username: "elcajon", password: "elcajon123", role: "dealer", store: "El Cajon Ford" },
  brandon: { name: "Brandon Ford Login", username: "brandon", password: "brandon123", role: "dealer", store: "Brandon Ford" },
  friendly: { name: "Friendly Ford Login", username: "friendly", password: "friendly123", role: "dealer", store: "Friendly Ford" },
};

const defaultPasswords = Object.fromEntries(
  Object.entries(logins).map(([key, account]) => [key, account.password])
);

const loadSavedPasswords = () => {
  try {
    const saved = localStorage.getItem("fixedOpsPasswords");
    return saved ? { ...defaultPasswords, ...JSON.parse(saved) } : defaultPasswords;
  } catch {
    return defaultPasswords;
  }
};

const savePasswords = (passwords) => {
  localStorage.setItem("fixedOpsPasswords", JSON.stringify(passwords));
};

const today = () => new Date().toISOString().slice(0, 10);
const dateKey = (date) => date.toISOString().slice(0, 10);
const toNum = (value) => Number(String(value || "").replace(/[$,]/g, "")) || 0;
const trunc = (value, digits = 2) => Math.trunc(Number(value || 0) * 10 ** digits) / 10 ** digits;
const money = (value, digits = 2) =>
  trunc(value, digits).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const qty = (value, digits = 0) =>
  trunc(value, digits).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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
  do {
    d.setDate(d.getDate() - 1);
  } while (dayStatus(dateKey(d)).closed);
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
  const passed = open.filter((d) => new Date(`${d}T12:00:00`) < selected);
  return { passed: passed.length, total: open.length, closed: dates.length - open.length };
};
const fmtDate = (dateString) =>
  new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const fmtMonth = (dateString) =>
  new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const blank = (store, date) => ({
  id: `${store}-${date}`,
  store,
  date,
  repairOrders: "",
  hours: "",
  labor: "",
  parts: "",
  laborGross: "",
  partsGross: "",
});

const totalsOf = (rows) => {
  const totals = rows.reduce(
    (acc, row) => {
      acc.repairOrders += toNum(row.repairOrders);
      acc.hours += toNum(row.hours);
      acc.labor += toNum(row.labor);
      acc.parts += toNum(row.parts);
      acc.laborGross += toNum(row.laborGross);
      acc.partsGross += toNum(row.partsGross);
      return acc;
    },
    { repairOrders: 0, hours: 0, labor: 0, parts: 0, laborGross: 0, partsGross: 0 }
  );

  totals.totalSale = totals.labor + totals.parts;
  totals.totalGross = totals.laborGross + totals.partsGross;
  totals.elr = totals.hours > 0 ? totals.labor / totals.hours : 0;
  totals.partsToLabor = totals.labor > 0 ? totals.parts / totals.labor : 0;
  totals.grossPerRo = totals.repairOrders > 0 ? totals.totalGross / totals.repairOrders : 0;
  return totals;
};

const seedData = () => {
  const seed = {};
  const dates = monthDates(today());

  stores.forEach((store) => {
    dates.forEach((date) => {
      seed[`${store}-${date}`] = blank(store, date);
    });
  });

  return seed;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function Stat({ title, value, sub, children, className = "" }) {
  return (
    <Card className={`p-5 text-center ${className}`}>
      <p className="text-base font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
      {sub && <p className="mt-2 text-sm text-slate-500">{sub}</p>}
      {children}
    </Card>
  );
}

function Badge({ value, benchmark }) {
  const below = Number(value || 0) < Number(benchmark || 0);
  return (
    <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${below ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
      {below ? "↓ Below Avg" : "↑ At/Above Avg"}
    </span>
  );
}

function Progress({ percent }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${p}%` }} />
    </div>
  );
}

function Field({ label, value, onChange, disabled = false }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        className={`h-12 w-full rounded-xl border-2 px-3 text-lg outline-none ${
          disabled
            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
            : "border-yellow-400 bg-yellow-100 focus:border-yellow-600"
        }`}
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
      />
    </div>
  );
}

export default function FixedOpsTracker() {
  const [tab, setTab] = useState("daily");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeLoginKey, setActiveLoginKey] = useState(null);
  const [savedPasswords, setSavedPasswords] = useState(loadSavedPasswords);
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [entryError, setEntryError] = useState("");
  const [selectedStore, setSelectedStore] = useState(stores[0]);
  const [date, setDate] = useState(priorBusinessDay());
  const [entries, setEntries] = useState(seedData);

  const activeLogin = activeLoginKey ? logins[activeLoginKey] : null;
  const allowedStores = stores;
  const store = allowedStores.includes(selectedStore) ? selectedStore : allowedStores[0];
  const canEditStore = activeLogin?.role === "director" || activeLogin?.store === store;
  const key = `${store}-${date}`;
  const current = entries[key] || blank(store, date);
  const t = timing(date);
  const monthPercent = t.total > 0 ? (t.passed / t.total) * 100 : 0;
  const multiplier = t.passed > 0 ? t.total / t.passed : 0;

  const allRows = useMemo(() => Object.values(entries), [entries]);
  const visibleRows = allRows;
  const selectedRows = allRows.filter((row) => row.store === store);
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

  const update = (field, value) => {
    const nextEntry = { ...(entries[key] || blank(store, date)), [field]: value };
    const labor = toNum(nextEntry.labor);
    const laborGross = toNum(nextEntry.laborGross);
    const parts = toNum(nextEntry.parts);
    const partsGross = toNum(nextEntry.partsGross);

    if (laborGross > labor && labor > 0) {
      setEntryError("Labor Gross cannot be higher than Total Labor.");
      return;
    }

    if (partsGross > parts && parts > 0) {
      setEntryError("Parts Gross cannot be higher than Total Parts.");
      return;
    }

    setEntryError("");
    setEntries((prev) => ({
      ...prev,
      [key]: nextEntry,
    }));
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const found = Object.entries(logins).find(
      ([loginKey, account]) =>
        account.username.toLowerCase() === loginUsername.trim().toLowerCase() &&
        savedPasswords[loginKey] === loginPassword
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
    setShowPasswordPanel(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
  };

  const changePassword = (event) => {
    event.preventDefault();
    setPasswordMessage("");

    if (savedPasswords[activeLoginKey] !== currentPassword) {
      setPasswordMessage("Current password is incorrect.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }

    const updatedPasswords = { ...savedPasswords, [activeLoginKey]: newPassword };
    setSavedPasswords(updatedPasswords);
    savePasswords(updatedPasswords);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated for this login.");
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
              <input
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900"
                value={loginUsername}
                onChange={(event) => setLoginUsername(event.target.value)}
                placeholder="richard"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Password</label>
              <input
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="director123"
              />
            </div>
            {loginError && <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">{loginError}</p>}
            <button className="h-12 w-full rounded-xl bg-slate-900 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm" type="submit">
              Login
            </button>
          </form>

          <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
            <p className="font-bold text-slate-800">Demo logins</p>
            <p className="mt-2">Director: richard / director123</p>
            <p>Honda: pasadena / pasadena123</p>
            <p>Seattle: seattle / seattle123</p>
            <p>El Cajon: elcajon / elcajon123</p>
            <p>Brandon: brandon / brandon123</p>
            <p>Friendly: friendly / friendly123</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight">Dealer Operating Control Service</h2>
        </div>

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
              <button
                className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => {
                  setShowPasswordPanel((value) => !value);
                  setPasswordMessage("");
                }}
              >
                Change Password
              </button>
              <button className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>

        <Card className="mb-6 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase text-slate-500">Dealership</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                value={store}
                disabled={false}
                onChange={(event) => setSelectedStore(event.target.value)}
              >
                {allowedStores.map((storeName) => <option key={storeName}>{storeName}</option>)}
              </select>
            </div>
            <Stat title="Working Days Passed" value={qty(t.passed)} />
            <Stat title="Working Days In Month" value={qty(t.total)} />
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <p className="font-semibold">Working Month Progress</p>
              <p>{qty(monthPercent, 1)}% complete · {qty(t.closed)} closed days excluded</p>
            </div>
            <Progress percent={monthPercent} />
          </div>
        </Card>

        {showPasswordPanel && (
          <Card className="mb-6 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Change Password</h2>
                <p className="text-sm text-slate-500">Update the password for {activeLogin.name}.</p>
              </div>
              <p className="rounded-xl bg-yellow-100 px-4 py-3 text-sm font-bold text-slate-700">
                Prototype password storage is browser-based.
              </p>
            </div>

            <form onSubmit={changePassword} className="mt-5 grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Current Password</label>
                <input
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">New Password</label>
                <input
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Confirm New Password</label>
                <input
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button className="h-12 w-full rounded-xl bg-slate-900 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm" type="submit">
                  Save Password
                </button>
              </div>
            </form>
            {passwordMessage && (
              <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${passwordMessage.includes("updated") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {passwordMessage}
              </p>
            )}
          </Card>
        )}

        <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-4">
          {[
            ["daily", "DAILY ENTRY"],
            ["weekly", "MONTHLY SUMMARY"],
            ["forecast", "MTD & TRACKING"],
            ["director", "GROUP OVERVIEW"],
          ].map(([tabKey, label]) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`rounded-2xl border-2 px-4 py-3 text-sm font-extrabold uppercase tracking-wide shadow-sm transition ${
                tab === tabKey
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "daily" && (
          <DailyTab current={current} date={date} setDate={setDate} update={update} daily={daily} canEditStore={canEditStore} activeLogin={activeLogin} store={store} entryError={entryError} />
        )}

        {tab === "weekly" && (
          <MonthlyTab monthRows={monthRows} monthly={monthly} selected={selected} forecast={forecast} multiplier={multiplier} group={group} store={store} date={date} />
        )}

        {tab === "forecast" && (
          <ForecastTab selected={selected} forecast={forecast} forecastTotalSale={forecastTotalSale} group={group} monthPercent={monthPercent} store={store} date={date} />
        )}

        {tab === "director" && (
          <DirectorTab
            allowedStores={allowedStores}
            stores={stores}
            visibleRows={visibleRows}
            group={group}
            monthPercent={monthPercent}
            groupLaborForecast={groupLaborForecast}
            groupPartsForecast={groupPartsForecast}
            groupLaborGrossForecast={groupLaborGrossForecast}
            groupPartsGrossForecast={groupPartsGrossForecast}
            groupSaleForecast={groupSaleForecast}
            groupGrossForecast={groupGrossForecast}
            groupLaborGrossPct={groupLaborGrossPct}
            groupPartsGrossPct={groupPartsGrossPct}
          />
        )}
      </div>
    </div>
  );
}

function DailyTab({ current, date, setDate, update, daily, canEditStore, activeLogin, store, entryError }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Daily Entry</h2>
            <p className="text-sm text-slate-500">Enter numbers for the prior open business day. Sundays and holidays are skipped automatically.</p>
            {!canEditStore && (
              <p className="mt-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                Read only: {activeLogin.name} can view {store}, but can only edit {activeLogin.store}.
              </p>
            )}
            {entryError && (
              <p className="mt-2 rounded-xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700">
                {entryError}
              </p>
            )}
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

function MonthlyTab({ monthRows, monthly, selected, forecast, multiplier, group, store, date }) {
  const monthEndTracking = forecast.labor + forecast.parts;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Stat title="Month ROs" value={qty(monthly.repairOrders)} sub={`Tracking: ${qty(selected.repairOrders * multiplier)}`} />
        <Stat title="Month Hours" value={qty(monthly.hours, 1)} sub={`Tracking: ${qty(selected.hours * multiplier, 1)}`} />
        <Stat title="Month Labor" value={money(monthly.labor)} sub={`Tracking: ${money(forecast.labor)}`} />
        <Stat title="Month Parts" value={money(monthly.parts)} sub={`Tracking: ${money(forecast.parts)}`} />
        <Stat title="Month ELR" value={money(monthly.elr)} sub={`Group ELR: ${money(group.elr)}`}>
          <Badge value={monthly.elr} benchmark={group.elr} />
        </Stat>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Stat title="Total Parts and Service" value={money(monthly.totalSale)} sub="Labor + Parts" className="md:min-h-[150px] md:p-8" />
        <Stat title="Month End Tracking" value={money(monthEndTracking)} sub="Parts and service tracking" className="md:min-h-[150px] md:p-8" />
      </div>

      <Card className="overflow-visible p-0">
        <div className="sticky top-0 z-30 rounded-t-2xl border-b border-slate-200 bg-white px-5 pb-3 pt-5 shadow-sm">
          <h2 className="text-xl font-bold">Monthly Summary — {store}</h2>
          <p className="mt-1 text-sm text-slate-500">{fmtMonth(date)}</p>
        </div>
        <div className="px-5 pb-5">
          <div className="mt-5 max-h-[560px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500">
                  {['Date', 'Status', 'ROs', 'Hours', 'Labor', 'Parts', 'Labor Gross', 'Parts Gross', 'ELR'].map((heading) => (
                    <th key={heading} className="sticky top-0 z-30 bg-white p-3 shadow-sm">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row) => {
                  const rowTotals = totalsOf([row]);
                  const status = dayStatus(row.date);
                  return (
                    <tr key={row.id} className={`border-b ${status.closed ? "bg-slate-100 text-slate-500" : ""}`}>
                      <td className="p-3 font-semibold">{fmtDate(row.date)}</td>
                      <td className="p-3">{status.reason}</td>
                      <td className="p-3">{qty(rowTotals.repairOrders)}</td>
                      <td className="p-3">{qty(rowTotals.hours, 1)}</td>
                      <td className="p-3">{money(rowTotals.labor)}</td>
                      <td className="p-3">{money(rowTotals.parts)}</td>
                      <td className="p-3">{money(rowTotals.laborGross)}</td>
                      <td className="p-3">{money(rowTotals.partsGross)}</td>
                      <td className="p-3">{money(rowTotals.elr)}{rowTotals.hours > 0 && !status.closed ? <Badge value={rowTotals.elr} benchmark={group.elr} /> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ForecastTab({ selected, forecast, forecastTotalSale, group, monthPercent, store, date }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Stat title="MTD Parts and Service Total" value={money(selected.totalSale)} sub={`${qty(monthPercent, 1)}% of month passed`}>
          <div className="mt-4 rounded-xl bg-slate-100 p-5">
            <p className="font-bold text-slate-500">Service Sale: {money(selected.labor)} · Gross: {money(selected.laborGross)}</p>
            <p className="mt-2 font-bold text-slate-500">Parts Sale: {money(selected.parts)} · Gross: {money(selected.partsGross)}</p>
            <p className="mt-3 border-t pt-3 font-extrabold">Combined Gross: {money(selected.totalGross)}</p>
          </div>
        </Stat>
        <Stat title="Month End Tracking Parts & Service" value={money(forecastTotalSale)}>
          <div className="mt-4 rounded-xl bg-slate-100 p-5">
            <p className="font-bold text-slate-500">Service Tracking: {money(forecast.labor)} · Gross: {money(forecast.laborGross)}</p>
            <p className="mt-2 font-bold text-slate-500">Parts Tracking: {money(forecast.parts)} · Gross: {money(forecast.partsGross)}</p>
            <p className="mt-3 border-t pt-3 font-extrabold">Combined Gross Tracking: {money(forecast.totalGross)}</p>
          </div>
        </Stat>
      </div>

      <Card className="p-5">
        <h2 className="text-xl font-bold">MTD & Tracking — {store}</h2>
        <p className="mt-1 text-sm text-slate-500">{fmtMonth(date)}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Stat title="Total ROs" value={qty(forecast.repairOrders)} />
          <Stat title="Total Hours" value={qty(forecast.hours, 1)} />
          <Stat title="Total Labor" value={money(forecast.labor)} />
          <Stat title="Total Parts" value={money(forecast.parts)} />
          <Stat title="Current ELR" value={money(selected.elr)} sub={`Group ELR: ${money(group.elr)}`}>
            <Badge value={selected.elr} benchmark={group.elr} />
          </Stat>
          <Stat title="Gross Per RO" value={money(selected.grossPerRo)} sub={`Group Avg: ${money(group.grossPerRo)}`}>
            <Badge value={selected.grossPerRo} benchmark={group.grossPerRo} />
          </Stat>
          <Stat title="Parts to Labor Ratio" value={`${qty(selected.partsToLabor * 100, 1)}%`} sub={`Group Avg: ${qty(group.partsToLabor * 100, 1)}%`}>
            <Badge value={selected.partsToLabor} benchmark={group.partsToLabor} />
          </Stat>
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
        <Stat title="Group Labor Gross" value={money(group.laborGross)} sub={`Tracking: ${money(groupLaborGrossForecast)}`}>
          <p className="mt-2 text-sm font-semibold text-slate-500">Gross Profit %: {qty(groupLaborGrossPct, 2)}%</p>
        </Stat>
        <div className="md:col-span-2 md:row-span-2">
          <Card className="h-full p-8">
            <div className="flex h-full min-h-[330px] flex-col items-center justify-center text-center">
              <p className="text-xl font-bold text-slate-500">Parts and Service Summary</p>
              <div className="mt-6 w-full space-y-5 rounded-2xl bg-slate-100 px-6 py-6">
                <SummaryLine label="Total Sale" value={money(group.totalSale)} />
                <SummaryLine label="Total Gross" value={money(group.totalGross)} />
                <SummaryLine label="Tracking End of Month" value={money(groupSaleForecast)} />
                <SummaryLine label="Tracking Gross End of Month" value={money(groupGrossForecast)} />
              </div>
            </div>
          </Card>
        </div>
        <Stat title="Group Parts Sale" value={money(group.parts)} sub={`Tracking: ${money(groupPartsForecast)}`} />
        <Stat title="Group Parts Gross" value={money(group.partsGross)} sub={`Tracking: ${money(groupPartsGrossForecast)}`}>
          <p className="mt-2 text-sm font-semibold text-slate-500">Gross Profit %: {qty(groupPartsGrossPct, 2)}%</p>
        </Stat>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-xl font-bold">GROUP OVERVIEW — Store Running Totals</h2>
        <p className="mb-4 text-sm text-slate-500">Dealers are shown side by side in their own boxes so each store can compare performance against the group.</p>
        <div className="overflow-x-auto">
          <div className="flex gap-4 pb-2">
            {stores.filter((storeName) => allowedStores.includes(storeName)).map((storeName) => {
              const storeTotals = totalsOf(visibleRows.filter((row) => row.store === storeName));
              return (
                <Card key={storeName} className="min-w-[260px] bg-slate-50 p-5 shadow-none">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold">{storeName}</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">{qty(monthPercent, 1)}% month</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <StoreBox label="MTD ROs" value={qty(storeTotals.repairOrders)} />
                    <StoreBox label="Hours" value={qty(storeTotals.hours, 1)} />
                    <StoreBox label="Labor Sales" value={money(storeTotals.labor)} />
                    <StoreBox label="Parts Sales" value={money(storeTotals.parts)} />
                    <StoreBox label="Labor Gross" value={money(storeTotals.laborGross)} />
                    <StoreBox label="Parts Gross" value={money(storeTotals.partsGross)} />
                    <StoreBox label="ELR" value={money(storeTotals.elr)} badge={<Badge value={storeTotals.elr} benchmark={group.elr} />} sub={`Group ELR: ${money(group.elr)}`} />
                    <StoreBox label="Gross Per RO" value={money(storeTotals.grossPerRo)} badge={<Badge value={storeTotals.grossPerRo} benchmark={group.grossPerRo} />} sub={`Group Avg: ${money(group.grossPerRo)}`} />
                    <StoreBox label="Parts/Labor" value={`${qty(storeTotals.partsToLabor * 100, 1)}%`} badge={<Badge value={storeTotals.partsToLabor} benchmark={group.partsToLabor} />} sub={`Group Avg: ${qty(group.partsToLabor * 100, 1)}%`} />
                    <StoreBox label="Month Progress" value={`${qty(monthPercent, 1)}%`} />
                  </div>
                  <Progress percent={monthPercent} />
                </Card>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="border-t first:border-t-0 first:pt-0 pt-5">
      <p className="text-sm font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-extrabold">{value}</p>
    </div>
  );
}

function StoreBox({ label, value, badge, sub }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}{badge}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
