import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { getLeaveReport } from "../services/api";
import toast from "react-hot-toast";
import UserAvatar from "../components/common/UserAvatar";
import {
  MdEventNote, MdPeople, MdCalendarMonth, MdBarChart, MdClose, MdArrowForward,
  MdAdminPanelSettings, MdGroup
} from "react-icons/md";

const TEAM_ROLES = ["manager", "team_lead"];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ROLE_LABELS = {
  employee:     "Employee",
  team_lead:    "Team Lead",
  manager:      "Manager",
  hr:           "HR",
  main_manager: "Main Manager",
  admin:        "Admin",
};
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const LEAVE_TYPE_COLORS = {
  casual:   { bg: "bg-blue-100",   text: "text-blue-700",   label: "Casual" },
  sick:     { bg: "bg-red-100",    text: "text-red-700",    label: "Sick" },
  optional: { bg: "bg-green-100",  text: "text-green-700",  label: "Optional" },
  special:  { bg: "bg-purple-100", text: "text-purple-700", label: "Special" },
};

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function fmtDate(d) {
  try { return format(parseISO(d), "dd/MM/yyyy"); }
  catch { return d || "—"; }
}

function LeaveTypeBadge({ type }) {
  const cfg = LEAVE_TYPE_COLORS[type?.toLowerCase()] || { bg: "bg-gray-100", text: "text-gray-600", label: type || "—" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function DetailModal({ emp, year, month, onClose }) {
  const leaves = month === 0
    ? emp.leaves
    : emp.leaves.filter((l) => {
        try { return parseISO(l.start_date).getMonth() + 1 === month; }
        catch { return false; }
      });

  const totalDays = leaves.reduce((s, l) => s + (l.days || 1), 0);

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-center justify-between">
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
            { label: "Total Days", value: totalDays },
            { label: month === 0 ? "Year" : "Month", value: month === 0 ? year : MONTHS[month - 1] },
            { label: "Leaves", value: leaves.length },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-3">
              <p className="text-lg font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Leaves list */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {leaves.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">No leaves in this period</p>
          ) : leaves.map((l, i) => (
            <div key={l.start_date + i} className="px-3 py-2.5 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <MdCalendarMonth className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">
                      {fmtDate(l.start_date)}
                      {l.end_date && l.end_date !== l.start_date && (
                        <span className="text-gray-400 font-normal"> → {fmtDate(l.end_date)}</span>
                      )}
                      <span className="ml-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        {l.days || 1} day{(l.days || 1) !== 1 ? "s" : ""}
                      </span>
                    </p>
                    <LeaveTypeBadge type={l.leave_type} />
                  </div>
                  {l.reason && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate" title={l.reason}>{l.reason}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Approved by <span className="font-semibold text-gray-600">{l.approved_by}</span>
                  </p>
                </div>
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

export default function AdminLeavePage() {
  const { user } = useSelector((s) => s.auth);
  const role = user?.role || "";
  const isTeamScope = TEAM_ROLES.includes(role);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [buFilter, setBuFilter] = useState("");
  const showBUFilter = !isTeamScope;
  const [selected, setSelected] = useState(null);

  const load = (y) => {
    setLoading(true);
    getLeaveReport(y)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load leave report"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(year); }, [year]);

  // Unique department and role options from full data
  const allDepts = [...new Set((data?.employees || []).map((e) => e.department).filter(Boolean))].sort();
  const allRoles = [...new Set((data?.employees || []).map((e) => e.role).filter(Boolean))].sort();

  // Step 1: apply dept + role filter to the full employee list (no month filter yet)
  const deptRoleFiltered = (data?.employees || []).filter((e) => {
    const matchDept = deptFilter ? e.department === deptFilter : true;
    const matchRole = roleFilter ? e.role === roleFilter : true;
    const matchBU = buFilter ? e.business_unit === buFilter : true;
    return matchDept && matchRole && matchBU;
  });

  // Step 2: compute monthly breakdown from dept+role filtered employees
  const filteredMonthly = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const count = deptRoleFiltered.reduce((sum, emp) => {
      const monthLeaves = emp.leaves.filter((l) => {
        try { return parseISO(l.start_date).getMonth() + 1 === m; }
        catch { return false; }
      });
      return sum + monthLeaves.reduce((s, l) => s + (l.days || 1), 0);
    }, 0);
    return { month: m, count };
  });

  // Step 3: cards computed from filteredMonthly
  const filteredYearTotal = deptRoleFiltered.reduce((s, e) => s + e.count, 0);
  const filteredThisMonth = filteredMonthly[currentMonth - 1]?.count ?? 0;
  const filteredPeakMonth = filteredMonthly.some((m) => m.count > 0)
    ? MONTHS[filteredMonthly.reduce((a, b) => (b.count > a.count ? b : a)).month - 1]
    : "—";
  const maxMonth = Math.max(...filteredMonthly.map((m) => m.count), 1);

  // Step 4: apply month filter for the table
  const employees = deptRoleFiltered.map((emp) => {
    if (month === 0) return emp;
    const filtered = emp.leaves.filter((l) => {
      try { return parseISO(l.start_date).getMonth() + 1 === month; }
      catch { return false; }
    });
    const filteredDays = filtered.reduce((s, l) => s + (l.days || 1), 0);
    return { ...emp, leaves: filtered, count: filteredDays };
  }).filter((emp) => emp.count > 0);

  // Step 5: apply search for the table
  const filteredEmployees = employees.filter((e) =>
    e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  const displayTotal = month === 0 ? filteredYearTotal : filteredEmployees.reduce((s, e) => s + e.count, 0);

  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 3; y--) yearOptions.push(y);

  const activeFilters = [deptFilter, roleFilter, buFilter].filter(Boolean).length;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Leave Report</h1>
            {isTeamScope ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700">
                <MdGroup size={13} /> My Team
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                <MdAdminPanelSettings size={13} /> All Employees
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            {isTeamScope
              ? "Approved leave overview for your assigned team"
              : "Approved leave overview across all employees in the organisation"}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {showBUFilter && (
            <select
              value={buFilter}
              onChange={(e) => setBuFilter(e.target.value)}
              className="px-2 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-auto"
            >
              <option value="">All Business Units</option>
              <option value="mepstra_power_solutions">MEPstra Power Solutions</option>
              <option value="mepstra_engineering_consultancy">MEPstra Engineering Consultancy</option>
            </select>
          )}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-auto"
          >
            <option value="">All Departments</option>
            {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-auto"
          >
            <option value="">All Roles</option>
            {allRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-2 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-auto"
          >
            <option value={0}>All Months</option>
            {MONTH_FULL.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-2 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-auto"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => { setDeptFilter(""); setRoleFilter(""); setBuFilter(""); }}
              className="col-span-2 sm:col-span-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
            >
              Clear Filters ({activeFilters})
            </button>
          )}
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MdEventNote,      label: month === 0 ? "Total Leave Days (Year)" : `Total Leave Days (${MONTHS[month - 1]})`, value: loading ? "—" : displayTotal,        gradient: "linear-gradient(135deg,#34d399,#059669)" },
          { icon: MdPeople,         label: "Employees Used Leave", value: loading ? "—" : (month === 0 ? deptRoleFiltered.length : filteredEmployees.length), gradient: "linear-gradient(135deg,#667eea,#764ba2)" },
          { icon: MdCalendarMonth,  label: "This Month",         value: loading ? "—" : filteredThisMonth,  gradient: "linear-gradient(135deg,#f093fb,#f5576c)" },
          { icon: MdBarChart,       label: "Peak Month",         value: loading ? "—" : filteredPeakMonth,  gradient: "linear-gradient(135deg,#43e97b,#38f9d7)" },
        ].map(({ icon: Icon, label, value, gradient }) => (
          <motion.div key={label} variants={fadeUp}
            className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
            style={{ background: gradient }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Icon className="text-white text-xl" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-white">{value}</p>
              <p className="text-white/80 text-xs sm:text-sm font-medium mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Monthly bar chart */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MdBarChart className="text-emerald-500" /> Monthly Breakdown — {year}
        </h2>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="flex items-end gap-2 h-36">
            {filteredMonthly.map((m) => {
              const pct = maxMonth > 0 ? (m.count / maxMonth) * 100 : 0;
              const isActive = month === 0 || month === m.month;
              return (
                <button
                  key={m.month}
                  onClick={() => setMonth(month === m.month ? 0 : m.month)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <span className="text-xs font-bold text-emerald-600">{m.count > 0 ? m.count : ""}</span>
                  <div className="w-full rounded-t-lg bg-gray-100 relative" style={{ height: "96px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className={`absolute bottom-0 w-full rounded-t-lg transition-opacity ${isActive ? "bg-gradient-to-t from-emerald-500 to-emerald-300" : "bg-gray-300 opacity-40"}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${month === m.month ? "text-emerald-600 font-bold" : "text-gray-400"}`}>
                    {MONTHS[m.month - 1]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {month !== 0 && (
          <p className="text-xs text-emerald-600 font-semibold mt-2 text-center cursor-pointer hover:underline" onClick={() => setMonth(0)}>
            Showing {MONTH_FULL[month - 1]} only — click to show all months
          </p>
        )}
      </motion.div>

      {/* Employee table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              <MdPeople className="text-emerald-500" />
              {isTeamScope ? "Team Leave Summary" : "All Employees Leave Summary"}
              {month !== 0 && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {MONTH_FULL[month - 1]} {year}
                </span>
              )}
            </h2>
            {(deptFilter || roleFilter) && (
              <div className="flex gap-1.5 flex-wrap">
                {deptFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                    Dept: {deptFilter}
                    <button onClick={() => setDeptFilter("")} className="ml-0.5 hover:text-teal-900">×</button>
                  </span>
                )}
                {roleFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                    Role: {ROLE_LABELS[roleFilter] || roleFilter}
                    <button onClick={() => setRoleFilter("")} className="ml-0.5 hover:text-violet-900">×</button>
                  </span>
                )}
              </div>
            )}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or department…"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400">
            <MdEventNote className="text-5xl mb-3 text-gray-200" />
            <p className="font-medium">No leave records for {month !== 0 ? `${MONTH_FULL[month - 1]} ` : ""}{year}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Employee", "Department", "Role", "Leave Days", "Leave Types", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, i) => {
                  const typeSet = [...new Set(emp.leaves.map((l) => l.leave_type).filter(Boolean))];
                  return (
                    <tr
                      key={i}
                      onClick={() => setSelected(emp)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${i % 2 === 0 ? "bg-white hover:bg-emerald-50" : "bg-slate-50/60 hover:bg-emerald-50"}`}
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
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                          {ROLE_LABELS[emp.role] || emp.role || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                          {emp.count} day{emp.count !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {typeSet.map((t) => <LeaveTypeBadge key={t} type={t} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline whitespace-nowrap">
                          View Details <MdArrowForward />
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
