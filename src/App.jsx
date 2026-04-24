import React, { useMemo, useState } from "react";

const stores = [
  "Honda of Pasadena",
  "CDJR Seattle",
  "El Cajon Ford",
  "Brandon Ford",
  "Friendly Ford",
];

const logins = {
  director: { name: "Richard / Director", role: "director", store: "All Stores" },
  pasadena: { name: "Honda of Pasadena Login", role: "dealer", store: "Honda of Pasadena" },
  seattle: { name: "CDJR Seattle Login", role: "dealer", store: "CDJR Seattle" },
  elcajon: { name: "El Cajon Ford Login", role: "dealer", store: "El Cajon Ford" },
  brandon: { name: "Brandon Ford Login", role: "dealer", store: "Brandon Ford" },
  friendly: { name: "Friendly Ford Login", role: "dealer", store: "Friendly Ford" },
};

const today = () => new Date().toISOString().slice(0, 10);

const getDateParts = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);
  return {
    date,
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    dayOfWeek: date.getDay(),
  };
};

const dateKey = (date) => date.toISOString().slice(0, 10);

const nthWeekdayOfMonth = (year, month, weekday, nth) => {
  const first = new Date(year, month, 1, 12, 0, 0);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return dateKey(new Date(year, month, day, 12, 0, 0));
};

const lastWeekdayOfMonth = (year, month, weekday) => {
  const last = new Date(year, month + 1, 0, 12, 0, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  last.setDate(last.getDate() - offset);
  return dateKey(last);
};

const fixedHoliday = (year, month, day) => dateKey(new Date(year, month, day, 12, 0, 0));

const getUSHolidays = (year) => ({
  [fixedHoliday(year, 0, 1)]: "New Year's Day",
  [lastWeekdayOfMonth(year, 4, 1)]: "Memorial Day",
  [fixedHoliday(year, 6, 4)]: "Independence Day",
  [nthWeekdayOfMonth(year, 8, 1, 1)]: "Labor Day",
  [nthWeekdayOfMonth(year, 10, 4, 4)]: "Thanksgiving",
  [fixedHoliday(year, 11, 25)]: "Christmas Day",
});

const getDayStatus = (dateString) => {
  const { year, dayOfWeek } = getDateParts(dateString);
  const holidayName = getUSHolidays(year)[dateString];

  if (dayOfWeek === 0) {
    return { isClosed: true, reason: "Sunday Closed" };
  }

  if (holidayName) {
    return { isClosed: true, reason: holidayName };
  }

  return { isClosed: false, reason: "Open" };
};

const getMonthDates = (dateString) => {
  const selected = new Date(`${dateString}T12:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1, 12, 0, 0);
    return date.toISOString().slice(0, 10);
  });
};

const getMonthTiming = (dateString) => {
  const selected = new Date(`${dateString}T12:00:00`);
  const monthDates = getMonthDates(dateString);
  const openDates = monthDates.filter((date) => !getDayStatus(date).isClosed);
  const openDatesPassed = openDates.filter((date) => new Date(`${date}T12:00:00`) <= selected);

  return {
    daysElapsed: openDatesPassed.length,
    daysInMonth: openDates.length,
    closedDays: monthDates.filter((date) => getDayStatus(date).isClosed).length,
  };
};

const formatMonth = (dateString) => {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const formatDate = (dateString) => {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const toNum = (value) => {
  const parsed = Number(String(value || "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const dollars = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const qty = (value, digits = 0) => {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const blankEntry = (store, date) => ({
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

const totalRows = (rows) => {
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

  totals.totalGross = totals.laborGross + totals.partsGross;
  totals.elr = totals.hours > 0 ? totals.labor / totals.hours : 0;
  totals.partsToLabor = totals.labor > 0 ? totals.parts / totals.labor : 0;
  totals.grossPerRo = totals.repairOrders > 0 ? totals.totalGross / totals.repairOrders : 0;
  return totals;
};

const buildSeedData = () => {
  const seed = {};
  const dates = getMonthDates(today());

  stores.forEach((store, storeIndex) => {
    dates.forEach((date, dateIndex) => {
      const base = storeIndex + 1;
      seed[`${store}-${date}`] = {
        ...blankEntry(store, date),
        repairOrders: dateIndex < new Date().getDate() ? String(28 + base * 3 + (dateIndex % 6) * 2) : "",
        hours: dateIndex < new Date().getDate() ? String(72 + base * 8 + (dateIndex % 6) * 5) : "",
        labor: dateIndex < new Date().getDate() ? String(11200 + base * 1400 + (dateIndex % 6) * 850) : "",
        parts: dateIndex < new Date().getDate() ? String(7900 + base * 1000 + (dateIndex % 6) * 600) : "",
        laborGross: dateIndex < new Date().getDate() ? String(6800 + base * 800 + (dateIndex % 6) * 500) : "",
        partsGross: dateIndex < new Date().getDate() ? String(4200 + base * 550 + (dateIndex % 6) * 350) : "",
      };
    });
  });

  return seed;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function StatCard({ title, value, sub }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </Card>
  );
}

function Field({ label, value, onChange, type = "number" }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg outline-none focus:border-slate-900"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
      />
    </div>
  );
}

function ProgressBar({ percent }) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${safePercent}%` }} />
    </div>
  );
}

export default function FixedOpsDailyTracker() {
  const [activeTab, setActiveTab] = useState("daily");
  const [loginKey, setLoginKey] = useState("director");
  const [selectedStore, setSelectedStore] = useState(stores[0]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [entries, setEntries] = useState(buildSeedData);

  const activeLogin = logins[loginKey];
  const allowedStores = activeLogin.role === "director" ? stores : [activeLogin.store];
  const storeForView = allowedStores.includes(selectedStore) ? selectedStore : allowedStores[0];
  const currentKey = `${storeForView}-${selectedDate}`;
  const currentEntry = entries[currentKey] || blankEntry(storeForView, selectedDate);

  const monthTiming = useMemo(() => getMonthTiming(selectedDate), [selectedDate]);
  const workingDaysElapsed = monthTiming.daysElapsed;
  const workingDaysInMonth = monthTiming.daysInMonth;
  const closedDaysInMonth = monthTiming.closedDays;
  const monthPercent = workingDaysInMonth > 0 ? (workingDaysElapsed / workingDaysInMonth) * 100 : 0;
  const forecastMultiplier = workingDaysElapsed > 0 ? workingDaysInMonth / workingDaysElapsed : 0;

  const allRows = useMemo(() => Object.values(entries), [entries]);
  const visibleRows = useMemo(() => allRows.filter((row) => allowedStores.includes(row.store)), [allRows, allowedStores]);
  const selectedRows = useMemo(() => allRows.filter((row) => row.store === storeForView), [allRows, storeForView]);
  const monthDates = useMemo(() => getMonthDates(selectedDate), [selectedDate]);
  const monthlyRows = useMemo(
    () => monthDates.map((date) => entries[`${storeForView}-${date}`] || blankEntry(storeForView, date)),
    [entries, storeForView, monthDates]
  );

  const dailyTotals = totalRows([currentEntry]);
  const selectedTotals = totalRows(selectedRows);
  const monthlyListTotals = totalRows(monthlyRows);
  const groupTotals = totalRows(visibleRows);

  const selectedForecast = {
    repairOrders: selectedTotals.repairOrders * forecastMultiplier,
    hours: selectedTotals.hours * forecastMultiplier,
    labor: selectedTotals.labor * forecastMultiplier,
    parts: selectedTotals.parts * forecastMultiplier,
    laborGross: selectedTotals.laborGross * forecastMultiplier,
    partsGross: selectedTotals.partsGross * forecastMultiplier,
    totalGross: selectedTotals.totalGross * forecastMultiplier,
  };

  const psbGrossForecast = groupTotals.totalGross * forecastMultiplier;

  const updateEntry = (field, value) => {
    setEntries((previous) => ({
      ...previous,
      [currentKey]: {
        ...(previous[currentKey] || blankEntry(storeForView, selectedDate)),
        [field]: value,
      },
    }));
  };

  const changeLogin = (value) => {
    setLoginKey(value);
    const nextLogin = logins[value];
    if (nextLogin.role === "dealer") {
      setSelectedStore(nextLogin.store);
    }
  };

  const tabs = [
    ["daily", "Daily Entry"],
    ["weekly", "Monthly Summary"],
    ["forecast", "MTD & Forecast"],
    ["director", "Director Overview"],
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-950">Dealer Operating Control Service</h2>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fixed Ops Daily Tracker</h1>
            <p className="mt-1 text-sm text-slate-500">Daily entry, weekly summary, MTD forecast, and director overview.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900"
              value={loginKey}
              onChange={(event) => changeLogin(event.target.value)}
            >
              {Object.entries(logins).map(([key, item]) => (
                <option key={key} value={key}>{item.name}</option>
              ))}
            </select>
            <button className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">Save Entry</button>
            <button className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Export Report</button>
          </div>
        </div>

        <Card className="mb-6 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Dealership</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-slate-900 disabled:bg-slate-100"
                value={storeForView}
                disabled={activeLogin.role !== "director"}
                onChange={(event) => setSelectedStore(event.target.value)}
              >
                {allowedStores.map((store) => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
              {activeLogin.role !== "director" ? <p className="mt-2 text-xs text-slate-500">Dealer login is locked to this store.</p> : null}
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Working Days Passed</label>
              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-lg font-bold text-slate-700">
                {workingDaysElapsed}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Working Days In Month</label>
              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-lg font-bold text-slate-700">
                {workingDaysInMonth}
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Working Month Progress</span>
                <span>{qty(monthPercent, 1)}% complete · {closedDaysInMonth} closed days excluded</span>
              </div>
              <ProgressBar percent={monthPercent} />
            </div>
          </div>
        </Card>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm md:grid-cols-4">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${activeTab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "daily" && (
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Daily Entry</h2>
                  <p className="text-sm text-slate-500">Enter the daily numbers for the selected dealership and date.</p>
                </div>
                <div className="w-full md:w-56">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Entry Date</label>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-slate-900"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Total Repair Orders" value={currentEntry.repairOrders} onChange={(value) => updateEntry("repairOrders", value)} />
                <Field label="Total Hours" value={currentEntry.hours} onChange={(value) => updateEntry("hours", value)} />
                <Field label="Total Labor" value={currentEntry.labor} onChange={(value) => updateEntry("labor", value)} />
                <Field label="Total Parts" value={currentEntry.parts} onChange={(value) => updateEntry("parts", value)} />
                <Field label="Total Labor Gross" value={currentEntry.laborGross} onChange={(value) => updateEntry("laborGross", value)} />
                <Field label="Total Parts Gross" value={currentEntry.partsGross} onChange={(value) => updateEntry("partsGross", value)} />
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-6">
              <StatCard title="Daily ELR" value={dollars(dailyTotals.elr)} sub="Labor ÷ Hours" />
              <StatCard title="Labor Total" value={dollars(dailyTotals.labor)} />
              <StatCard title="Parts Total" value={dollars(dailyTotals.parts)} />
              <StatCard title="Labor Gross" value={dollars(dailyTotals.laborGross)} />
              <StatCard title="Parts Gross" value={dollars(dailyTotals.partsGross)} />
              <StatCard title="Daily Gross" value={dollars(dailyTotals.totalGross)} />
            </div>
          </div>
        )}

        {activeTab === "weekly" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard title="Month ROs" value={qty(monthlyListTotals.repairOrders)} />
              <StatCard title="Month Hours" value={qty(monthlyListTotals.hours, 1)} />
              <StatCard title="Month Labor" value={dollars(monthlyListTotals.labor)} />
              <StatCard title="Month Parts" value={dollars(monthlyListTotals.parts)} />
              <StatCard title="Month ELR" value={dollars(monthlyListTotals.elr)} />
            </div>

            <Card className="p-5">
              <h2 className="text-xl font-bold">Monthly Summary — {storeForView}</h2>
              <p className="mt-1 text-sm text-slate-500">Full month view for {formatMonth(selectedDate)}. Sundays plus New Year’s Day, Memorial Day, July 4th, Labor Day, Thanksgiving, and Christmas are marked closed and excluded from forecast working days.</p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">ROs</th>
                      <th className="p-3">Hours</th>
                      <th className="p-3">Labor</th>
                      <th className="p-3">Parts</th>
                      <th className="p-3">Labor Gross</th>
                      <th className="p-3">Parts Gross</th>
                      <th className="p-3">ELR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row) => {
                      const rowTotal = totalRows([row]);
                      const status = getDayStatus(row.date);
                      return (
                        <tr key={row.id} className={`border-b last:border-0 ${status.isClosed ? "bg-slate-100 text-slate-500" : ""}`}>
                          <td className="p-3 font-semibold">{formatDate(row.date)}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.isClosed ? "bg-white text-slate-600" : "bg-green-50 text-green-700"}`}>
                              {status.reason}
                            </span>
                          </td>
                          <td className="p-3">{qty(rowTotal.repairOrders)}</td>
                          <td className="p-3">{qty(rowTotal.hours, 1)}</td>
                          <td className="p-3">{dollars(rowTotal.labor)}</td>
                          <td className="p-3">{dollars(rowTotal.parts)}</td>
                          <td className="p-3">{dollars(rowTotal.laborGross)}</td>
                          <td className="p-3">{dollars(rowTotal.partsGross)}</td>
                          <td className="p-3">{dollars(rowTotal.elr)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "forecast" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard title="MTD Total Gross" value={dollars(selectedTotals.totalGross)} sub={`${qty(monthPercent, 1)}% of month passed`} />
              <StatCard title="Forecast Labor Gross" value={dollars(selectedForecast.laborGross)} />
              <StatCard title="Forecast Parts Gross" value={dollars(selectedForecast.partsGross)} />
              <StatCard title="Total Parts and Service Gross Forecast" value={dollars(selectedForecast.totalGross)} sub="Forecast labor gross + parts gross" />
            </div>

            <Card className="p-5">
              <h2 className="text-xl font-bold">MTD & Forecast — {storeForView}</h2>
              <p className="mt-1 text-sm text-slate-500">Forecast uses: MTD total ÷ working days passed × working days in month. Sundays plus New Year’s Day, Memorial Day, July 4th, Labor Day, Thanksgiving, and Christmas are excluded automatically.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <StatCard title="Forecast ROs" value={qty(selectedForecast.repairOrders)} />
                <StatCard title="Forecast Hours" value={qty(selectedForecast.hours, 1)} />
                <StatCard title="Forecast Labor" value={dollars(selectedForecast.labor)} />
                <StatCard title="Forecast Parts" value={dollars(selectedForecast.parts)} />
                <StatCard title="Current ELR" value={dollars(selectedTotals.elr)} />
                <StatCard title="Gross Per RO" value={dollars(selectedTotals.grossPerRo)} />
              </div>
            </Card>
          </div>
        )}

        {activeTab === "director" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard title="Group Repair Orders" value={qty(groupTotals.repairOrders)} />
              <StatCard title="Group Hours" value={qty(groupTotals.hours, 1)} />
              <StatCard title="Group ELR" value={dollars(groupTotals.elr)} />
              <StatCard title="PSB Gross" value={dollars(psbGrossForecast)} sub="Forecast labor gross + parts gross" />
              <StatCard title="Group Labor" value={dollars(groupTotals.labor)} />
              <StatCard title="Group Parts" value={dollars(groupTotals.parts)} />
              <StatCard title="Group Labor Gross" value={dollars(groupTotals.laborGross)} />
              <StatCard title="Group Parts Gross" value={dollars(groupTotals.partsGross)} />
            </div>

            <Card className="p-5">
              <h2 className="mb-4 text-xl font-bold">Director Overview — Store Running Totals</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {stores.filter((store) => allowedStores.includes(store)).map((store) => {
                  const totals = totalRows(visibleRows.filter((row) => row.store === store));
                  return (
                    <Card key={store} className="bg-slate-50 p-5 shadow-none">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold">{store}</h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">{qty(monthPercent, 1)}% month</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-slate-500">MTD ROs</p><p className="font-bold">{qty(totals.repairOrders)}</p></div>
                        <div><p className="text-slate-500">Hours</p><p className="font-bold">{qty(totals.hours, 1)}</p></div>
                        <div><p className="text-slate-500">Labor</p><p className="font-bold">{dollars(totals.labor)}</p></div>
                        <div><p className="text-slate-500">Parts</p><p className="font-bold">{dollars(totals.parts)}</p></div>
                        <div><p className="text-slate-500">Labor Gross</p><p className="font-bold">{dollars(totals.laborGross)}</p></div>
                        <div><p className="text-slate-500">Parts Gross</p><p className="font-bold">{dollars(totals.partsGross)}</p></div>
                        <div><p className="text-slate-500">ELR</p><p className="font-bold">{dollars(totals.elr)}</p></div>
                        <div><p className="text-slate-500">Parts/Labor</p><p className="font-bold">{qty(totals.partsToLabor * 100, 1)}%</p></div>
                      </div>
                      <ProgressBar percent={monthPercent} />
                    </Card>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
