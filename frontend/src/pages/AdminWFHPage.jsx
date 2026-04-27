import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { getWFHReport } from "../services/api";
import toast from "react-hot-toast";
import UserAvatar from "../components/common/UserAvatar";
import { MdHomeWork, MdPeople, MdCalendarMonth, MdBarChart, MdClose, MdArrowForward } from "react-icons/md";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function fmtDate(d) {
  try { return format(parseISO(d), "dd MMM yyyy"); }
  catch { return d || "—"; }
}

function DetailModal({ emp, year, month, onClose }) {
  const dates = month === 0
    ? emp.dates
    : emp.dates.filter((d) => {
        try { return parseISO(d.date).getMonth() + 1 === month; }
        catch { return false; }
      });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar name={emp.employee_name} profileImage={emp.profile_image} size="md" />
            <div>
              <p className="text-white font-bold">{emp.employee_name}</p>
              <p className="text-white/70 text-xs">{emp.department}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
            <MdClose />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: "Total Days", value: dates.reduce((s, d) => s + (d.days || 1), 0) },
            { label: month === 0 ? "Year" : "Month", value: month === 0 ? year : MONTHS[month - 1] },
            { label: "Requests", value: dates.length },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-3">
              <p className="text-lg font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Dates list */}
        <div className="p-5 max-h-72 overflow-y-auto space-y-2">
          {dates.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No WFH in this period</p>
          ) : dates.map((d, i) => (
            <div key={d.date + i} className="flex items-center gap-3 px-3 py-2.5 bg-sky-50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <MdCalendarMonth className="text-sky-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {fmtDate(d.date)}
                  {d.end_date && d.end_date !== d.date && (
                    <span className="text-gray-400 font-normal"> → {fmtDate(d.end_date)}</span>
                  )}
                  <span className="ml-2 text-xs font-bold text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full">
                    {d.days || 1} day{(d.days || 1) !== 1 ? "s" : ""}
                  </span>
                </p>
                <p className="text-xs text-gray-400">Approved by <span className="font-semibold text-gray-600">{d.approved_by}</span></p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminWFHPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0); // 0 = all months
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const load = (y) => {
    setLoading(true);
    getWFHReport(y)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load WFH report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(year); }, [year]);

  // Filter employees by selected month — sum actual days, not count requests
  const employees = (data?.employees || []).map((emp) => {
    if (month === 0) return emp;
    const filtered = emp.dates.filter((d) => {
      try { return parseISO(d.date).getMonth() + 1 === month; }
      catch { return false; }
    });
    const filteredDays = filtered.reduce((s, d) => s + (d.days || 1), 0);
    return { ...emp, dates: filtered, count: filteredDays };
  }).filter((emp) => emp.count > 0);

  const filteredEmployees = employees.filter((e) =>
    e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const displayTotal = filteredEmployees.reduce((s, e) => s + e.count, 0);
  const maxMonth = data ? Math.max(...data.monthly.map((m) => m.count), 1) : 1;

  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 3; y--) yearOptions.push(y);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">WFH Report</h1>
          <p className="text-gray-400 text-sm mt-0.5">Work from home overview across all employees</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <option value={0}>All Months</option>
            {MONTH_FULL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MdHomeWork,      label: month === 0 ? "Total WFH (Year)" : `Total WFH (${MONTHS[month-1]})`, value: displayTotal || data?.total && month === 0 ? (month === 0 ? (data?.total ?? "—") : displayTotal) : (loading ? "—" : displayTotal), gradient: "linear-gradient(135deg,#4facfe,#00f2fe)" },
          { icon: MdPeople,        label: "Employees Used WFH", value: filteredEmployees.length || (loading ? "—" : 0),  gradient: "linear-gradient(135deg,#667eea,#764ba2)" },
          { icon: MdCalendarMonth, label: "This Month",          value: data?.monthly?.[currentMonth - 1]?.count ?? "—", gradient: "linear-gradient(135deg,#f093fb,#f5576c)" },
          { icon: MdBarChart,      label: "Peak Month",          value: data ? MONTHS[data.monthly.reduce((a,b)=>b.count>a.count?b:a,data.monthly[0]).month-1] : "—", gradient: "linear-gradient(135deg,#43e97b,#38f9d7)" },
        ].map(({ icon: Icon, label, value, gradient }) => (
          <motion.div key={label} variants={fadeUp}
            className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
            style={{ background: gradient }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Icon className="text-white text-xl" />
              </div>
              <p className="text-3xl font-extrabold text-white">{value}</p>
              <p className="text-white/80 text-sm font-medium mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Monthly bar chart */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MdBarChart className="text-sky-500" /> Monthly Breakdown — {year}
        </h2>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="flex items-end gap-2 h-36">
            {(data?.monthly || []).map((m) => {
              const pct = maxMonth > 0 ? (m.count / maxMonth) * 100 : 0;
              const isActive = month === 0 || month === m.month;
              return (
                <button
                  key={m.month}
                  onClick={() => setMonth(month === m.month ? 0 : m.month)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-xs font-bold text-sky-600">{m.count > 0 ? m.count : ""}</span>
                  <div className="w-full rounded-t-lg bg-gray-100 relative" style={{ height: "96px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={`absolute bottom-0 w-full rounded-t-lg transition-opacity ${isActive ? "bg-gradient-to-t from-sky-500 to-sky-300" : "bg-gray-300 opacity-40"}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${month === m.month ? "text-sky-600 font-bold" : "text-gray-400"}`}>{MONTHS[m.month - 1]}</span>
                </button>
              );
            })}
          </div>
        )}
        {month !== 0 && (
          <p className="text-xs text-sky-600 font-semibold mt-2 text-center cursor-pointer hover:underline" onClick={() => setMonth(0)}>
            Showing {MONTH_FULL[month - 1]} only — click to show all months
          </p>
        )}
      </motion.div>

      {/* Employee table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MdPeople className="text-violet-500" />
            Employee WFH Summary
            {month !== 0 && <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{MONTH_FULL[month-1]} {year}</span>}
          </h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or department…"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 w-72"
          />
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400">
            <MdHomeWork className="text-5xl mb-3 text-gray-200" />
            <p className="font-medium">No WFH records for {month !== 0 ? `${MONTH_FULL[month-1]} ` : ""}{year}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Employee", "Department", "Total Days", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelected(emp)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white hover:bg-sky-50" : "bg-slate-50/60 hover:bg-sky-50"}`}
                  >
                    <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={emp.employee_name} profileImage={emp.profile_image} size="sm" rounded="full" />
                        <span className="font-semibold text-gray-800">{emp.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700">
                        {emp.count} day{emp.count !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline">
                        View Details <MdArrowForward />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <DetailModal emp={selected} year={year} month={month} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
