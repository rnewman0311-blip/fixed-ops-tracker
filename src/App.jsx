import React, { useMemo, useState } from "react";

const stores = ["Honda of Pasadena", "CDJR Seattle", "El Cajon Ford", "Brandon Ford", "Friendly Ford"];
const logins = {
  director: { name: "Richard / Director", role: "director", store: "All Stores" },
  pasadena: { name: "Honda of Pasadena Login", role: "dealer", store: "Honda of Pasadena" },
  seattle: { name: "CDJR Seattle Login", role: "dealer", store: "CDJR Seattle" },
  elcajon: { name: "El Cajon Ford Login", role: "dealer", store: "El Cajon Ford" },
  brandon: { name: "Brandon Ford Login", role: "dealer", store: "Brandon Ford" },
  friendly: { name: "Friendly Ford Login", role: "dealer", store: "Friendly Ford" },
};

const today = () => new Date().toISOString().slice(0, 10);
const toNum = (v) => Number(String(v || "").replace(/[$,]/g, "")) || 0;
const trunc = (v, d = 2) => Math.trunc(Number(v || 0) * Math.pow(10, d)) / Math.pow(10, d);
const money = (v, d = 2) => trunc(v, d).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
const qty = (v, d = 0) => trunc(v, d).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const dateKey = (date) => date.toISOString().slice(0, 10);
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
  const h = holidays(d.getFullYear())[dateString];
  if (d.getDay() === 0) return { closed: true, reason: "Sunday Closed" };
  if (h) return { closed: true, reason: h };
  return { closed: false, reason: "Open" };
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
const fmtDate = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtMonth = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

const blank = (store, date) => ({ id: `${store}-${date}`, store, date, repairOrders: "", hours: "", labor: "", parts: "", laborGross: "", partsGross: "" });
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
  t.totalGross = t.laborGross + t.partsGross;
  t.elr = t.hours > 0 ? t.labor / t.hours : 0;
  t.partsToLabor = t.labor > 0 ? t.parts / t.labor : 0;
  t.grossPerRo = t.repairOrders > 0 ? t.totalGross / t.repairOrders : 0;
  return t;
};
const seedData = () => {
  const seed = {};
  const dates = monthDates(today());
  const currentDay = new Date().getDate();
  stores.forEach((store, s) => {
    dates.forEach((date, i) => {
      const b = s + 1;
      const has = i < currentDay;
      seed[`${store}-${date}`] = {
        ...blank(store, date),
        repairOrders: has ? String(28 + b * 3 + (i % 6) * 2) : "",
        hours: has ? String(72 + b * 8 + (i % 6) * 5) : "",
        labor: has ? String(11200 + b * 1400 + (i % 6) * 850) : "",
        parts: has ? String(7900 + b * 1000 + (i % 6) * 600) : "",
        laborGross: has ? String(6800 + b * 800 + (i % 6) * 500) : "",
        partsGross: has ? String(4200 + b * 550 + (i % 6) * 350) : "",
      };
    });
  });
  return seed;
};

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
function Stat({ title, value, sub, children, className = "" }) {
  return <Card className={`p-5 text-center ${className}`}><p className="text-base font-semibold text-slate-500">{title}</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>{sub && <p className="mt-2 text-sm text-slate-500">{sub}</p>}{children}</Card>;
}
function Badge({ value, benchmark }) {
  const bad = Number(value || 0) < Number(benchmark || 0);
  return <span className={`ml-2 inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${bad ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{bad ? "↓ Below Avg" : "↑ At/Above Avg"}</span>;
}
function Progress({ percent }) {
  const p = Math.min(100, Math.max(0, percent));
  return <div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-900" style={{ width: `${p}%` }} /></div>;
}
function Field({ label, value, onChange }) {
  return <div><label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label><input className="h-12 w-full rounded-xl border-2 border-yellow-400 bg-yellow-100 px-3 text-lg outline-none focus:border-yellow-600" type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" /></div>;
}

export default function FixedOpsTracker() {
  const [tab, setTab] = useState("daily");
  const [login, setLogin] = useState("director");
  const [selectedStore, setSelectedStore] = useState(stores[0]);
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState(seedData);

  const activeLogin = logins[login];
  const allowedStores = activeLogin.role === "director" ? stores : [activeLogin.store];
  const store = allowedStores.includes(selectedStore) ? selectedStore : allowedStores[0];
  const key = `${store}-${date}`;
  const current = entries[key] || blank(store, date);
  const t = timing(date);
  const monthPercent = t.total > 0 ? (t.passed / t.total) * 100 : 0;
  const multiplier = t.passed > 0 ? t.total / t.passed : 0;
  const allRows = useMemo(() => Object.values(entries), [entries]);
  const visibleRows = allRows.filter((r) => allowedStores.includes(r.store));
  const selectedRows = allRows.filter((r) => r.store === store);
  const monthRows = monthDates(date).map((d) => entries[`${store}-${d}`] || blank(store, d));
  const daily = totalsOf([current]);
  const selected = totalsOf(selectedRows);
  const monthly = totalsOf(monthRows);
  const group = totalsOf(visibleRows);
  const forecast = { labor: selected.labor * multiplier, parts: selected.parts * multiplier, laborGross: selected.laborGross * multiplier, partsGross: selected.partsGross * multiplier, totalGross: selected.totalGross * multiplier, repairOrders: selected.repairOrders * multiplier, hours: selected.hours * multiplier };
  const forecastTotalSale = forecast.labor + forecast.parts;
  const groupLaborForecast = group.labor * multiplier;
  const groupPartsForecast = group.parts * multiplier;
  const groupLaborGrossForecast = group.laborGross * multiplier;
  const groupPartsGrossForecast = group.partsGross * multiplier;
  const groupSaleForecast = (group.labor + group.parts) * multiplier;
  const groupGrossForecast = group.totalGross * multiplier;
  const groupLaborGrossPct = group.labor > 0 ? (group.laborGross / group.labor) * 100 : 0;
  const groupPartsGrossPct = group.parts > 0 ? (group.partsGross / group.parts) * 100 : 0;

  const update = (field, value) => setEntries((prev) => ({ ...prev, [key]: { ...(prev[key] || blank(store, date)), [field]: value } }));
  const changeLogin = (value) => { setLogin(value); if (logins[value].role === "dealer") setSelectedStore(logins[value].store); };

  return <div className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8"><div className="mx-auto max-w-7xl">
    <div className="mb-6 text-center"><h2 className="text-4xl font-extrabold tracking-tight">Dealer Operating Control Service</h2></div>
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h1 className="text-3xl font-bold">Fixed Ops Daily Tracker</h1><p className="text-sm text-slate-500">Daily entry, monthly summary, MTD forecast, and director overview.</p></div><div className="flex flex-col items-start gap-3 md:items-end"><div className="rounded-2xl border-2 border-yellow-400 bg-yellow-100 px-6 py-4 text-center shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-600">Current Month</p><p className="mt-1 text-3xl font-extrabold text-slate-950">{fmtMonth(date)}</p></div><select className="h-11 rounded-xl border border-slate-300 bg-white px-3" value={login} onChange={(e) => changeLogin(e.target.value)}>{Object.entries(logins).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div></div>
    <Card className="mb-6 p-5"><div className="grid gap-4 md:grid-cols-4"><div className="md:col-span-2"><label className="mb-2 block text-xs font-bold uppercase text-slate-500">Dealership</label><select className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 disabled:bg-slate-100" value={store} disabled={activeLogin.role !== "director"} onChange={(e) => setSelectedStore(e.target.value)}>{allowedStores.map((s) => <option key={s} value={s}>{s}</option>)}</select></div><Stat title="Working Days Passed" value={qty(t.passed)} /><Stat title="Working Days In Month" value={qty(t.total)} /><div className="md:col-span-4"><div className="flex justify-between text-sm"><span className="font-semibold">Working Month Progress</span><span>{qty(monthPercent, 1)}% complete · {t.closed} closed days excluded</span></div><Progress percent={monthPercent} /></div></div></Card>
    <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm md:grid-cols-4">{[["daily","Daily Entry"],["weekly","Monthly Summary"],["forecast","MTD & Forecast"],["director","GROUP OVERVIEW"]].map(([k, label]) => <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>)}</div>

    {tab === "daily" && <div className="space-y-6"><Card className="p-5"><div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-xl font-bold">Daily Entry</h2><p className="text-sm text-slate-500">Enter numbers for the selected dealership and date.</p></div><div className="w-full md:w-56"><label className="mb-2 block text-xs font-bold uppercase text-slate-500">Entry Date</label><input className="h-11 w-full rounded-xl border border-slate-300 px-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div></div><div className="grid gap-4 md:grid-cols-3"><Field label="Total Repair Orders" value={current.repairOrders} onChange={(v)=>update("repairOrders",v)} /><Field label="Total Hours" value={current.hours} onChange={(v)=>update("hours",v)} /><Field label="Total Labor" value={current.labor} onChange={(v)=>update("labor",v)} /><Field label="Total Parts" value={current.parts} onChange={(v)=>update("parts",v)} /><Field label="Total Labor Gross" value={current.laborGross} onChange={(v)=>update("laborGross",v)} /><Field label="Total Parts Gross" value={current.partsGross} onChange={(v)=>update("partsGross",v)} /></div></Card><div className="grid gap-4 md:grid-cols-6"><Stat title="Daily ELR" value={money(daily.elr)} sub="Labor ÷ Hours" /><Stat title="Labor Total" value={money(daily.labor)} /><Stat title="Parts Total" value={money(daily.parts)} /><Stat title="Labor Gross" value={money(daily.laborGross)} /><Stat title="Parts Gross" value={money(daily.partsGross)} /><Stat title="Daily Gross" value={money(daily.totalGross)} /></div></div>}

    {tab === "weekly" && <div className="space-y-6"><div className="grid gap-4 md:grid-cols-5"><Stat title="Month ROs" value={qty(monthly.repairOrders)} sub={`Forecast: ${qty(selected.repairOrders * multiplier)}`} /><Stat title="Month Hours" value={qty(monthly.hours,1)} sub={`Forecast: ${qty(selected.hours * multiplier,1)}`} /><Stat title="Month Labor" value={money(monthly.labor)} sub={`Forecast: ${money(forecast.labor)}`} /><Stat title="Month Parts" value={money(monthly.parts)} sub={`Forecast: ${money(forecast.parts)}`} /><Stat title="Month ELR" value={money(monthly.elr)} sub={`Group ELR: ${money(group.elr)}`}><Badge value={monthly.elr} benchmark={group.elr} /></Stat></div><Card className="p-0 overflow-visible"><div className="sticky top-0 z-30 rounded-t-2xl border-b border-slate-200 bg-white px-5 pb-3 pt-5 shadow-sm"><h2 className="text-xl font-bold">Monthly Summary — {store}</h2><p className="mt-1 text-sm text-slate-500">{fmtMonth(date)}</p></div><div className="px-5 pb-5"><div className="mt-5 max-h-[560px] overflow-auto rounded-xl border border-slate-200"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Date</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Status</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">ROs</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Hours</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Labor</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Parts</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Labor Gross</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">Parts Gross</th><th className="sticky top-0 z-30 bg-white p-3 shadow-sm">ELR</th></tr></thead><tbody>{monthRows.map((r)=>{const rt=totalsOf([r]);const st=dayStatus(r.date);return <tr key={r.id} className={`border-b ${st.closed?"bg-slate-100 text-slate-500":""}`}><td className="p-3 font-semibold">{fmtDate(r.date)}</td><td className="p-3">{st.reason}</td><td className="p-3">{qty(rt.repairOrders)}</td><td className="p-3">{qty(rt.hours,1)}</td><td className="p-3">{money(rt.labor)}</td><td className="p-3">{money(rt.parts)}</td><td className="p-3">{money(rt.laborGross)}</td><td className="p-3">{money(rt.partsGross)}</td><td className="p-3">{money(rt.elr)}{rt.hours>0&&!st.closed?<Badge value={rt.elr} benchmark={group.elr}/>:null}</td></tr>})}</tbody></table></div></div></Card></div>}

    {tab === "forecast" && <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2"><Stat title="MTD Parts and Service Total" value={money(selected.labor+selected.parts)} sub={`${qty(monthPercent,1)}% of month passed`}><div className="mt-4 rounded-xl bg-slate-100 p-5"><p className="font-bold text-slate-500">Service Sale: {money(selected.labor)} · Gross: {money(selected.laborGross)}</p><p className="mt-2 font-bold text-slate-500">Parts Sale: {money(selected.parts)} · Gross: {money(selected.partsGross)}</p><p className="mt-3 border-t pt-3 font-extrabold">Combined Gross: {money(selected.totalGross)}</p></div></Stat><Stat title="Forecast Parts and Service Total" value={money(forecastTotalSale)}><div className="mt-4 rounded-xl bg-slate-100 p-5"><p className="font-bold text-slate-500">Service Forecast: {money(forecast.labor)} · Gross: {money(forecast.laborGross)}</p><p className="mt-2 font-bold text-slate-500">Parts Forecast: {money(forecast.parts)} · Gross: {money(forecast.partsGross)}</p><p className="mt-3 border-t pt-3 font-extrabold">Combined Gross Forecast: {money(forecast.totalGross)}</p></div></Stat></div><Card className="p-5"><h2 className="text-xl font-bold">MTD & Forecast — {store}</h2><div className="mt-5 grid gap-4 md:grid-cols-3"><Stat title="Forecast ROs" value={qty(forecast.repairOrders)} /><Stat title="Forecast Hours" value={qty(forecast.hours,1)} /><Stat title="Forecast Labor" value={money(forecast.labor)} /><Stat title="Forecast Parts" value={money(forecast.parts)} /><Stat title="Current ELR" value={money(selected.elr)} sub={`Group ELR: ${money(group.elr)}`}><Badge value={selected.elr} benchmark={group.elr}/></Stat><Stat title="Gross Per RO" value={money(selected.grossPerRo)} sub={`Group Avg: ${money(group.grossPerRo)}`}><Badge value={selected.grossPerRo} benchmark={group.grossPerRo}/></Stat><Stat title="Parts to Labor Ratio" value={`${qty(selected.partsToLabor*100,1)}%`} sub={`Group Avg: ${qty(group.partsToLabor*100,1)}%`}><Badge value={selected.partsToLabor} benchmark={group.partsToLabor}/></Stat></div></Card></div>}

    {tab === "director" && <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Stat title="Group Repair Orders" value={qty(group.repairOrders)} /><Stat title="Group ELR" value={money(group.elr)} /><Stat title="Group Avg Gross Per RO" value={money(group.grossPerRo)} /><Stat title="Group Avg Parts/Labor" value={`${qty(group.partsToLabor*100,1)}%`} sub="Parts sale ÷ labor sale" /><Stat title="Group Labor Sale" value={money(group.labor)} sub={`Forecast: ${money(groupLaborForecast)}`} /><Stat title="Group Labor Gross" value={money(group.laborGross)} sub={`Forecast: ${money(groupLaborGrossForecast)}`}><p className="mt-2 text-sm font-semibold text-slate-500">Gross Profit %: {qty(groupLaborGrossPct,2)}%</p></Stat><div className="md:col-span-2 md:row-span-2"><Card className="h-full p-8"><div className="flex h-full min-h-[330px] flex-col items-center justify-center text-center"><p className="text-xl font-bold text-slate-500">Parts and Service Summary</p><div className="mt-6 w-full space-y-5 rounded-2xl bg-slate-100 px-6 py-6"><div><p className="text-sm font-bold uppercase text-slate-500">Total Sale</p><p className="mt-2 text-4xl font-extrabold">{money(group.labor+group.parts)}</p></div><div className="border-t pt-5"><p className="text-sm font-bold uppercase text-slate-500">Total Gross</p><p className="mt-2 text-4xl font-extrabold">{money(group.totalGross)}</p></div><div className="border-t pt-5"><p className="text-sm font-bold uppercase text-slate-500">Forecast Sale</p><p className="mt-2 text-4xl font-extrabold">{money(groupSaleForecast)}</p></div><div className="border-t pt-5"><p className="text-sm font-bold uppercase text-slate-500">Forecast Gross</p><p className="mt-2 text-4xl font-extrabold">{money(groupGrossForecast)}</p></div></div></div></Card></div><Stat title="Group Parts Sale" value={money(group.parts)} sub={`Forecast: ${money(groupPartsForecast)}`} /><Stat title="Group Parts Gross" value={money(group.partsGross)} sub={`Forecast: ${money(groupPartsGrossForecast)}`}><p className="mt-2 text-sm font-semibold text-slate-500">Gross Profit %: {qty(groupPartsGrossPct,2)}%</p></Stat></div><Card className="p-5"><h2 className="mb-4 text-xl font-bold">GROUP OVERVIEW — Store Running Totals</h2><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{stores.filter((s)=>allowedStores.includes(s)).map((s)=>{const st=totalsOf(visibleRows.filter((r)=>r.store===s));return <Card key={s} className="bg-slate-50 p-5 shadow-none"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-bold">{s}</h3><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">{qty(monthPercent,1)}% month</span></div><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">MTD ROs</p><p className="font-bold">{qty(st.repairOrders)}</p></div><div><p className="text-slate-500">Hours</p><p className="font-bold">{qty(st.hours,1)}</p></div><div><p className="text-slate-500">Labor Sales</p><p className="font-bold">{money(st.labor)}</p></div><div><p className="text-slate-500">Parts Sales</p><p className="font-bold">{money(st.parts)}</p></div><div><p className="text-slate-500">Labor Gross</p><p className="font-bold">{money(st.laborGross)}</p></div><div><p className="text-slate-500">Parts Gross</p><p className="font-bold">{money(st.partsGross)}</p></div><div className="col-span-2 rounded-xl bg-white p-3 shadow-sm"><p className="text-slate-500">ELR</p><p className="mt-1 text-lg font-bold">{money(st.elr)}<Badge value={st.elr} benchmark={group.elr}/></p><p className="text-xs text-slate-500">Group ELR: {money(group.elr)}</p></div><div className="col-span-2 rounded-xl bg-white p-3 shadow-sm"><p className="text-slate-500">Gross Per RO</p><p className="mt-1 text-lg font-bold">{money(st.grossPerRo)}<Badge value={st.grossPerRo} benchmark={group.grossPerRo}/></p><p className="text-xs text-slate-500">Group Avg: {money(group.grossPerRo)}</p></div><div className="col-span-2 rounded-xl bg-white p-3 shadow-sm"><p className="text-slate-500">Parts/Labor</p><p className="mt-1 text-lg font-bold">{qty(st.partsToLabor*100,1)}%<Badge value={st.partsToLabor} benchmark={group.partsToLabor}/></p><p className="text-xs text-slate-500">Group Avg: {qty(group.partsToLabor*100,1)}%</p></div></div><Progress percent={monthPercent}/></Card>})}</div></Card></div>}
  </div></div>;
}
