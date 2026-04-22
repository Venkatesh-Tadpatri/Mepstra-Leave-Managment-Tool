import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from "recharts";
import toast from "react-hot-toast";
import { getDashboardStats, getEmployeeLeaveReport, getMyStats, getOnLeaveToday, getLeaveSchedule, getDepartments, getWFHToday, getLeaves, cancelLeave } from "../services/api";
import { fetchBalance } from "../store/slices/leaveSlice";
import {
  MdPeople, MdPendingActions, MdPersonOff,
  MdEventNote, MdCalendarMonth, MdArrowForward,
  MdFileDownload, MdPictureAsPdf, MdClose, MdBeachAccess, MdLaptop,
  MdFilterList, MdCancel, MdWarning, MdAdd
} from "react-icons/md";

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

function fmtLeaveType(type) {
  if (!type) return "";
  if (type === "lop") return "LOP";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getLeaveTypeLabel(leave) {
  if (leave.leave_type !== "special") return fmtLeaveType(leave.leave_type);
  return (leave.reason || "").toLowerCase().startsWith("weekend work request:")
    ? "Weekend Work" : "Compensate";
}

const LEAVE_COLORS = {
  casual:    { bg: "bg-blue-100",    text: "text-blue-700"    },
  sick:      { bg: "bg-emerald-100", text: "text-emerald-700" },
  optional:  { bg: "bg-amber-100",  text: "text-amber-700"   },
  maternity: { bg: "bg-pink-100",   text: "text-pink-700"    },
  paternity: { bg: "bg-purple-100", text: "text-purple-700"  },
  special:   { bg: "bg-orange-100", text: "text-orange-700"  },
  lop:       { bg: "bg-gray-100",   text: "text-gray-700"    },
};

const STATUS_STYLES = {
  pending:             { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700",  dot: "#f59e0b" },
  approved:            { bg: "bg-green-50 border-green-200",   text: "text-green-700",   dot: "#10b981" },
  rejected:            { bg: "bg-red-50 border-red-200",       text: "text-red-700",     dot: "#ef4444" },
  cancelled:           { bg: "bg-gray-50 border-gray-200",     text: "text-gray-600",    dot: "#9ca3af" },
  approved_by_manager: { bg: "bg-blue-50 border-blue-200",     text: "text-blue-700",    dot: "#3b82f6" },
};

function CancelConfirmModal({ leave, onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-6 pt-7 pb-2 text-center">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <MdWarning className="text-orange-500 text-3xl" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 mb-1">Withdraw Leave Request</h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to withdraw your{" "}
            <span className="font-semibold text-gray-800">{fmtLeaveType(leave?.leave_type)} Leave</span>{" "}
            from <span className="font-semibold text-gray-800">{leave?.start_date}</span> to{" "}
            <span className="font-semibold text-gray-800">{leave?.end_date}</span>?
          </p>
        </div>
        <div className="flex gap-3 px-6 py-5">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Keep Leave
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
            Yes, Withdraw
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Simple info columns: [key, label]
const INFO_COLUMNS = [
  ["full_name", "Name"],
  ["email", "Email"],
  ["role", "Role"],
  ["department", "Department"],
  ["year", "Year"],
];

// Combined leave columns: [usedKey, remainingKey, label]
const LEAVE_COLUMNS = [
  ["casual_used",    "casual_remaining",    "Casual Leave"],
  ["sick_used",      "sick_remaining",      "Sick Leave"],
  ["optional_used",  "optional_remaining",  "Optional Leave"],
  ["special_used",   "special_remaining",   "Special Leave"],
  ["maternity_used", "maternity_remaining", "Maternity Leave"],
  ["paternity_used", "paternity_remaining", "Paternity Leave"],
  ["lop_used",       "lop_remaining",       "LOP"],
];

// Returns total days allocated for a leave type from a row
function leaveTotal(row, usedKey, remainingKey) {
  return (row[usedKey] ?? 0) + (row[remainingKey] ?? 0);
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

function StatCard({ icon: Icon, label, value, gradient, sub, onClick, delay = 0 }) {
  return (
    <motion.button
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 text-left w-full shadow-lg cursor-pointer`}
      style={{ background: gradient }}
    >
      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <Icon className="text-white text-2xl" />
        </div>
        <p className="text-3xl font-extrabold text-white">{value}</p>
        <p className="text-white/80 text-sm font-medium mt-0.5">{label}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
    </motion.button>
  );
}

function BalanceCard({ label, used, total, color, icon }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = total - used;
  return (
    <motion.div variants={fadeUp} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: color + "20", color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-xs font-bold" style={{ color }}>{remaining} left</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{used} used of {total} days</p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [filter] = useState({ year: new Date().getFullYear() });
  const [onLeaveList, setOnLeaveList] = useState(null);
  const [todayOnLeave, setTodayOnLeave] = useState([]);
  const [todayWFH, setTodayWFH] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [scheduleMonth, setScheduleMonth] = useState(new Date().getMonth() + 1);
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear());
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleDept, setScheduleDept] = useState(0);
  const [departments, setDepartments] = useState([]);
  // My Leaves table state
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveFilter, setLeaveFilter] = useState({ status: "", leave_type: "", year: new Date().getFullYear() });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const isAdmin = ["admin", "main_manager", "hr", "manager"].includes(user?.role);
  const isStrictAdmin = user?.role === "admin";
  const isHR = user?.role === "hr";
  const isManager = user?.role === "manager";
  const showLeaveTable = ["employee", "team_lead"].includes(user?.role);
  const showScheduleSection = isStrictAdmin || isManager || isHR;
  const showDeptFilter = isStrictAdmin || isHR;
  const canExportReport = ["admin", "hr"].includes(user?.role);

  useEffect(() => {
    if (isAdmin) getDashboardStats().then((r) => setStats(r.data)).catch(() => {});
    if (!isStrictAdmin) getMyStats().then((r) => setMyStats(r.data)).catch(() => {});
    if (showScheduleSection) {
      getOnLeaveToday().then((r) => setTodayOnLeave(r.data)).catch(() => {});
      getWFHToday().then((r) => setTodayWFH(r.data)).catch(() => {});
      getLeaveSchedule(new Date().getMonth() + 1, new Date().getFullYear(), null, 0)
        .then((r) => setSchedule(r.data)).catch(() => {});
    }
    if (showDeptFilter) {
      getDepartments().then((r) => setDepartments(r.data)).catch(() => {});
    }
  }, [isAdmin, isStrictAdmin, isManager, isHR, showScheduleSection, showDeptFilter]);

  useEffect(() => {
    if (!showScheduleSection) return;
    // If a specific date is picked, derive month/year/day from it; otherwise use dropdowns
    let m = scheduleMonth, y = scheduleYear, d = null;
    if (scheduleDay) {
      const picked = new Date(scheduleDay);
      m = picked.getMonth() + 1;
      y = picked.getFullYear();
      d = picked.getDate();
    }
    getLeaveSchedule(m, y, d, scheduleDept)
      .then((r) => setSchedule(r.data)).catch(() => {});
  }, [scheduleMonth, scheduleYear, scheduleDay, scheduleDept, showScheduleSection]);

  useEffect(() => {
    if (!showLeaveTable) return;
    getLeaves(leaveFilter)
      .then((r) => setMyLeaves(r.data || []))
      .catch(() => setMyLeaves([]));
  }, [leaveFilter, showLeaveTable]);

  async function handleConfirmCancel() {
    const leave = cancelTarget;
    setCancelTarget(null);
    setCancelling(true);
    try {
      await cancelLeave(leave.id);
      toast.success("Leave request withdrawn successfully");
      getLeaves(leaveFilter).then((r) => setMyLeaves(r.data || [])).catch(() => {});
      getMyStats().then((r) => setMyStats(r.data)).catch(() => {});
      dispatch(fetchBalance(leaveFilter.year));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to withdraw leave");
    } finally {
      setCancelling(false);
    }
  }

  function handleOnLeaveTodayClick() {
    getOnLeaveToday()
      .then((r) => setOnLeaveList(r.data))
      .catch(() => setOnLeaveList([]));
  }

  async function handleExportReport(type) {
    if (!canExportReport || exporting) return;
    setExporting(true);
    try {
      const res = await getEmployeeLeaveReport(filter.year);
      const rows = res.data?.rows || [];
      const year = res.data?.year || filter.year;
      if (!rows.length) {
        toast.error("No employee data available for export");
        return;
      }

      if (type === "csv") {
        const infoHeaders = ["#", ...INFO_COLUMNS.map(([, label]) => csvEscape(label))];
        const leaveHeaders = LEAVE_COLUMNS.map(([, , label]) => csvEscape(`${label} (Used / Remaining)`));
        const header = [...infoHeaders, ...leaveHeaders].join(",");
        const body = rows
          .map((row, i) => {
            const infoCells = [i + 1, ...INFO_COLUMNS.map(([key]) => csvEscape(row[key]))];
            const leaveCells = LEAVE_COLUMNS.map(([u, r]) => csvEscape(`${row[u] ?? 0} / ${row[r] ?? 0}`));
            return [...infoCells, ...leaveCells].join(",");
          })
          .join("\n");
        const csv = `${header}\n${body}`;
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `employee-leave-report-${year}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("CSV report downloaded");
        return;
      }

      const headHtml = [
        `<th class="info-th">#</th>`,
        ...INFO_COLUMNS.map(([, label]) => `<th class="info-th">${label}</th>`),
        ...LEAVE_COLUMNS.map(([, , label]) => {
          return `<th class="leave-th">${label}<br/><span class="th-sub">Used / Remaining</span></th>`;
        }),
      ].join("");
      const rowsHtml = rows
        .map((row, i) => {
          const cls = i % 2 === 0 ? "row-even" : "row-odd";
          const serialCell = `<td class="info-td" style="color:#94a3b8;text-align:center">${i + 1}</td>`;
          const infoCells = INFO_COLUMNS.map(([key]) => `<td class="info-td">${row[key] ?? ""}</td>`).join("");
          const leaveCells = LEAVE_COLUMNS.map(([u, r]) => {
            const used = row[u] ?? 0;
            const remaining = row[r] ?? 0;
            const total = used + remaining;
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            const color = pct === 0 ? "#16a34a" : pct < 50 ? "#d97706" : pct < 100 ? "#ea580c" : "#dc2626";
            return `<td class="leave-td"><span style="color:${color};font-weight:700">${used}</span><span style="color:#64748b;font-size:6.5px"> / ${remaining}</span></td>`;
          }).join("");
          return `<tr class="${cls}">${serialCell}${infoCells}${leaveCells}</tr>`;
        })
        .join("");
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups for PDF export.");
        return;
      }
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Annual Leave Report ${year} – Mepstra</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 10mm 10mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 277mm;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 8.5px;
      color: #1e293b;
      background: #fff;
    }

    /* ── Page wrapper with border ── */
    .page {
      width: 100%;
      min-height: 190mm;
      border: 2.5px solid #6366f1;
      border-radius: 6px;
      padding: 10px 12px 8px;
      display: flex;
      flex-direction: column;
    }

    /* ── Header band ── */
    .header-band {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #a855f7 100%);
      border-radius: 7px;
      padding: 10px 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      width: 36px; height: 36px; flex-shrink: 0;
      background: rgba(255,255,255,0.22);
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 900; color: #fff;
    }
    .header-text { flex: 1; }
    .header-title { font-size: 15px; font-weight: 800; color: #fff; line-height: 1.2; }
    .header-sub   { font-size: 8px; color: rgba(255,255,255,0.78); margin-top: 2px; font-weight: 500; }
    .header-right { text-align: right; flex-shrink: 0; }
    .header-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 5px; padding: 3px 10px;
      color: #fff; font-size: 10px; font-weight: 700;
    }
    .header-date { font-size: 7.5px; color: rgba(255,255,255,0.65); margin-top: 3px; }

    /* ── Meta row ── */
    .meta-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 6px; font-size: 7.5px; color: #64748b;
    }
    .note {
      background: #fef9c3; border: 1px solid #fde047;
      border-radius: 4px; padding: 2px 7px;
      color: #854d0e; font-size: 7px; font-weight: 500;
    }

    /* ── Table ── */
    table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      font-size: 7.5px;
    }
    col.col-name  { width: 13mm; }
    col.col-email { width: 28mm; }
    col.col-role  { width: 14mm; }
    col.col-dept  { width: 22mm; }
    col.col-year  { width: 8mm;  }
    col.col-leave { width: 15mm; }

    thead tr { background: #4f46e5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th {
      padding: 5px 4px; color: #fff;
      font-size: 7px; font-weight: 700;
      letter-spacing: 0.2px; text-align: center;
      border-right: 1px solid rgba(255,255,255,0.18);
      background: #4f46e5;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    th:last-child { border-right: none; }
    .info-th { background: #3730a3 !important; text-align: left; padding-left: 5px; }
    .th-sub { font-weight: 400; font-size: 6px; color: rgba(255,255,255,0.72); display: block; margin-top: 1px; }

    td {
      padding: 4px 4px;
      border-bottom: 1px solid #e2e8f0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .info-td { color: #334155; text-align: left; font-size: 7.5px; }
    .leave-td { text-align: center; font-weight: 600; font-size: 7.5px; }

    .row-even { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .row-odd  { background: #f5f3ff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    td.info-td:last-of-type, th.info-th:last-of-type {
      border-right: 2px solid #c7d2fe;
    }

    /* ── Footer ── */
    .footer {
      margin-top: auto; padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 6.5px; color: #94a3b8;
    }
    .footer-brand { color: #6366f1; font-weight: 700; }
    .footer-conf  { background: #fef2f2; border: 1px solid #fecaca; border-radius: 3px; padding: 1px 5px; color: #b91c1c; font-weight: 600; }

    @media print {
      html, body { width: 277mm; }
      .note { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-band">
      <div class="header-logo">M</div>
      <div class="header-text">
        <div class="header-title">Annual Leave Report</div>
        <div class="header-sub">Mepstra Engineering and Consultancy Pvt. Ltd.</div>
      </div>
      <div class="header-right">
        <div class="header-badge">FY ${year}</div>
        <div class="header-date">Generated: ${new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</div>
      </div>
    </div>

    <div class="meta-row">
      <span>Total Employees: <strong>${rows.length}</strong></span>
      <span class="note">&#9432; Select "Save as PDF" → Layout: Landscape in the print dialog</span>
    </div>

    <table>
      <colgroup>
        <col style="width:6mm"/>
        <col class="col-name"/>
        <col class="col-email"/>
        <col class="col-role"/>
        <col class="col-dept"/>
        <col class="col-year"/>
        ${LEAVE_COLUMNS.map(() => `<col class="col-leave"/>`).join("")}
      </colgroup>
      <thead><tr>${headHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="footer">
      <span class="footer-conf">CONFIDENTIAL</span>
      <span><span class="footer-brand">Mepstra Engineering and Consultancy Pvt. Ltd.</span> &nbsp;·&nbsp; Leave Management System</span>
      <span>Page 1 &nbsp;·&nbsp; FY ${year}</span>
    </div>
  </div>
</body>
</html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success("PDF print view opened");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to export report");
    } finally {
      setExporting(false);
    }
  }

  const pieData = myStats ? [
    { name: "Approved", value: myStats.approved || 0, color: "#10b981" },
    { name: "Pending",  value: myStats.pending  || 0, color: "#f59e0b" },
    { name: "Rejected", value: myStats.rejected || 0, color: "#ef4444" },
  ] : [];

  const balances = myStats?.balance ? [
    { label: "Casual Leave",    used: myStats.balance.casual_used,    total: myStats.balance.casual_total,    color: "#3b82f6", icon: "🌴" },
    { label: "Sick Leave",      used: myStats.balance.sick_used,      total: myStats.balance.sick_total,      color: "#10b981", icon: "🏥" },
    { label: "Optional Leave",  used: myStats.balance.optional_used,  total: myStats.balance.optional_total,  color: "#f59e0b", icon: "⭐" },
  ] : [];

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-6">
      {/* Page header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExportReport && (
            <>
              <button
                onClick={() => handleExportReport("csv")}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold disabled:opacity-50"
              >
                <MdFileDownload /> CSV
              </button>
              <button
                onClick={() => handleExportReport("pdf")}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold disabled:opacity-50"
              >
                <MdPictureAsPdf /> PDF
              </button>
            </>
          )}
          {!isStrictAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/leaves/apply")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
            >
              <MdEventNote /> Apply Leave <MdArrowForward className="text-xs" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Admin stat cards */}
      {isAdmin && stats && (
        <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={MdPeople}        label="Total Employees"  value={stats.total_employees}  gradient="linear-gradient(135deg,#667eea,#764ba2)" onClick={() => navigate("/employees")} />
          <StatCard icon={MdPendingActions} label="Pending Requests" value={stats.pending_requests} gradient="linear-gradient(135deg,#f093fb,#f5576c)" onClick={() => navigate("/approvals")} />
          <StatCard icon={MdLaptop}         label="WFH Today"        value={todayWFH.length}        gradient="linear-gradient(135deg,#4facfe,#00f2fe)" />
          <StatCard icon={MdPersonOff}     label="On Leave Today"   value={stats.on_leave_today}   gradient="linear-gradient(135deg,#43e97b,#38f9d7)" onClick={handleOnLeaveTodayClick} />
        </motion.div>
      )}

      {/* ── Admin/Manager: On Leave Today (inline) ── */}
      {showScheduleSection && (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <MdPersonOff className="text-emerald-500 text-xl" />
              <h3 className="font-bold text-gray-900">On Leave Today</h3>
              <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {todayOnLeave.length}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {todayOnLeave.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <MdBeachAccess className="text-4xl mb-2" />
              <p className="text-sm">No employees on leave today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Employee", "Department", "Leave Type", "From", "To", "Days"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayOnLeave.map((e, i) => (
                    <tr key={e.id} className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/60 hover:bg-blue-50/40"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {e.employee_name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{e.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.department}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{fmtLeaveType(e.leave_type)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.start_date}</td>
                      <td className="px-4 py-3 text-gray-600">{e.end_date}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{e.total_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Admin/Manager: Work From Home Today ── */}
      {showScheduleSection && (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <MdLaptop className="text-blue-500 text-xl" />
              <h3 className="font-bold text-gray-900">Work From Home Today</h3>
              <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {todayWFH.length}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          {todayWFH.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <MdLaptop className="text-4xl mb-2" />
              <p className="text-sm">No employees working from home today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Employee", "Department", "From", "To", "Days"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayWFH.map((e, i) => (
                    <tr key={e.id} className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/60 hover:bg-blue-50/40"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {e.employee_name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{e.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.department || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{e.start_date}</td>
                      <td className="px-4 py-3 text-gray-600">{e.end_date}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{e.total_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Admin/Manager: Leave Schedule by Month ── */}
      {showScheduleSection && (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <MdCalendarMonth className="text-violet-500 text-xl" />
              <h3 className="font-bold text-gray-900">Leave Schedule</h3>
              <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                {schedule.length} approved
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showDeptFilter && (
                <select
                  value={scheduleDept}
                  onChange={(e) => setScheduleDept(Number(e.target.value))}
                  className="input-field text-sm w-40"
                >
                  <option value={0}>All Departments</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={scheduleDay}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScheduleDay(val);
                    if (val) {
                      const d = new Date(val);
                      setScheduleMonth(d.getMonth() + 1);
                      setScheduleYear(d.getFullYear());
                    }
                  }}
                  className="input-field text-sm w-40"
                />
                {scheduleDay && (
                  <button
                    onClick={() => setScheduleDay("")}
                    className="text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    title="Clear date filter"
                  >
                    <MdClose />
                  </button>
                )}
              </div>
              {!scheduleDay && (
                <>
                  <select
                    value={scheduleMonth}
                    onChange={(e) => setScheduleMonth(Number(e.target.value))}
                    className="input-field text-sm w-36"
                  >
                    {["January","February","March","April","May","June","July","August","September","October","November","December"]
                      .map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={scheduleYear}
                    onChange={(e) => setScheduleYear(Number(e.target.value))}
                    className="input-field text-sm w-24"
                  >
                    {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </>
              )}
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <MdCalendarMonth className="text-4xl mb-2" />
              <p className="text-sm">No approved leaves for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["#", "Employee", "Department", "Leave Type", "From", "To", "Days", "Status", "Approved By", "Approved On"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((e, i) => (
                    <tr key={e.id} className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-violet-50/30" : "bg-slate-50/60 hover:bg-violet-50/40"}`}>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {e.employee_name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{e.employee_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{e.department}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{fmtLeaveType(e.leave_type)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.start_date}</td>
                      <td className="px-4 py-3 text-gray-600">{e.end_date}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{e.total_days}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {e.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const approver = e.main_manager || e.manager;
                          return approver ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                {approver.full_name?.[0]?.toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{approver.full_name}</span>
                            </div>
                          ) : <span className="text-gray-300 text-xs">—</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {(() => {
                          const dt = e.main_manager_action_at || e.manager_action_at;
                          if (!dt) return <span className="text-gray-300">—</span>;
                          const d = new Date(dt.endsWith("Z") ? dt : dt + "Z");
                          return (
                            <div>
                              <div className="font-medium text-gray-700">{d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                              <div className="text-gray-400 text-[10px]">{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* My Leaves section */}
      {showLeaveTable && myStats && (
        <>
          {/* Balance + Pie row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Balance card */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Leave Balance</h3>
                <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-full">{new Date().getFullYear()}</span>
              </div>
              <motion.div variants={stagger} className="space-y-3">
                {balances.map((b) => <BalanceCard key={b.label} {...b} />)}
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/leaves/apply")}
                className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2"
              >
                <MdAdd className="text-base" /> Apply for Leave
              </motion.button>
            </motion.div>

            {/* Pie chart */}
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Leave Status Overview</h3>
              <p className="text-xs text-gray-400 mb-3">This year's summary</p>
              {myStats.total_leaves === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                  <MdCalendarMonth className="text-5xl mb-2" />
                  <p className="text-sm">No leaves this year</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                    <Tooltip formatter={(v) => [`${v} requests`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[{ label: "Approved", val: myStats.approved, color: "#10b981" },
                  { label: "Pending",  val: myStats.pending,  color: "#f59e0b" },
                  { label: "Rejected", val: myStats.rejected, color: "#ef4444" }].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-xl bg-gray-50">
                    <p className="text-lg font-bold" style={{ color: s.color }}>{s.val}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Full My Leaves table */}
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header + filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <MdEventNote className="text-blue-500 text-xl" />
                <h3 className="font-bold text-gray-900">My Leaves</h3>
                <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {myLeaves.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MdFilterList className="text-gray-400 text-lg" />
                <select value={leaveFilter.status}
                  onChange={(e) => setLeaveFilter({ ...leaveFilter, status: e.target.value })}
                  className="input-field w-36 text-sm">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={leaveFilter.leave_type}
                  onChange={(e) => setLeaveFilter({ ...leaveFilter, leave_type: e.target.value })}
                  className="input-field w-36 text-sm">
                  <option value="">All Types</option>
                  <option value="casual">Casual</option>
                  <option value="sick">Sick</option>
                  <option value="optional">Optional</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="special">Special</option>
                  <option value="lop">LOP</option>
                </select>
                <select value={leaveFilter.year}
                  onChange={(e) => setLeaveFilter({ ...leaveFilter, year: Number(e.target.value) })}
                  className="input-field w-24 text-sm">
                  {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {(leaveFilter.status || leaveFilter.leave_type) && (
                  <button
                    onClick={() => setLeaveFilter({ ...leaveFilter, status: "", leave_type: "" })}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                    <MdClose className="text-sm" /> Clear
                  </button>
                )}
              </div>
            </div>

            {myLeaves.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MdEventNote className="text-blue-400 text-2xl" />
                </div>
                <p className="text-gray-600 font-semibold">No leave requests found</p>
                <p className="text-gray-400 text-sm mt-1">Apply for a leave to get started</p>
                <button onClick={() => navigate("/leaves/apply")}
                  className="mt-4 px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-md">
                  Apply Leave
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["#", "Type", "From", "To", "Days", "Reason", "Status", "Remarks", "Approved By", "Approved On", "Applied On", "Action"].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map((l, i) => {
                      const lc = LEAVE_COLORS[l.leave_type] || { bg: "bg-gray-100", text: "text-gray-600" };
                      const sc = STATUS_STYLES[l.status] || STATUS_STYLES.cancelled;
                      return (
                        <tr key={l.id}
                          className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/60 hover:bg-blue-50/40"}`}>
                          <td className="px-4 py-3.5 text-gray-300 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${lc.bg} ${lc.text}`}>
                              {getLeaveTypeLabel(l)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-700 font-medium">{l.start_date}</td>
                          <td className="px-4 py-3.5 text-gray-700 font-medium">{l.end_date}</td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-gray-900">{l.total_days}</span>
                            <span className="text-gray-400 text-xs ml-1">day{l.total_days !== 1 ? "s" : ""}</span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-500 max-w-[160px] truncate">{l.reason}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text}`}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                              {l.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-[180px]">
                            {l.status === "rejected" && (l.manager_comment || l.main_manager_comment) ? (
                              <div className="flex items-start gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                                <span className="text-red-400 text-xs mt-0.5">✕</span>
                                <span className="text-red-700 text-xs font-medium leading-snug">{l.manager_comment || l.main_manager_comment}</span>
                              </div>
                            ) : l.status === "approved" && (l.manager_comment || l.main_manager_comment) ? (
                              <div className="flex items-start gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-green-500 text-xs mt-0.5">✓</span>
                                <span className="text-green-700 text-xs font-medium leading-snug">{l.manager_comment || l.main_manager_comment}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs italic">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {l.status === "pending" ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : (() => {
                              const approver = l.main_manager || l.manager;
                              return approver ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                    {approver.full_name?.[0]?.toUpperCase()}
                                  </div>
                                  <span className="text-xs font-semibold text-gray-700">{approver.full_name}</span>
                                </div>
                              ) : <span className="text-gray-300 text-xs">—</span>;
                            })()}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                            {(() => {
                              const dt = l.main_manager_action_at || l.manager_action_at;
                              if (!dt) return <span className="text-gray-300">—</span>;
                              const d = new Date(dt.endsWith("Z") ? dt : dt + "Z");
                              return (
                                <div>
                                  <div className="font-medium text-gray-700">{d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                                  <div className="text-gray-400 text-[10px]">{d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                            {l.created_at ? new Date(l.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            {l.status === "pending" && (
                              <button
                                onClick={() => setCancelTarget(l)}
                                disabled={cancelling}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <MdCancel className="text-sm" /> Withdraw
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          <AnimatePresence>
            {cancelTarget && (
              <CancelConfirmModal
                leave={cancelTarget}
                onConfirm={handleConfirmCancel}
                onCancel={() => setCancelTarget(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}

      {/* On Leave Today Modal */}
      {onLeaveList !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setOnLeaveList(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">On Leave Today</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setOnLeaveList(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <MdClose />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto">
              {onLeaveList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MdPersonOff className="text-4xl mx-auto mb-2" />
                  <p className="text-sm">No one is on leave today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {onLeaveList.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {e.employee_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{e.employee_name}</p>
                        <p className="text-xs text-gray-400">{e.department || "—"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {fmtLeaveType(e.leave_type)}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">{e.total_days} day(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
