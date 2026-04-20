import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchLeaves, fetchBalance } from "../store/slices/leaveSlice";
import { getLeaves } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { MdAdd, MdFilterList, MdClose, MdEventNote, MdBeachAccess, MdLocalHospital, MdStar } from "react-icons/md";
import { format, parseISO } from "date-fns";

const LEAVE_COLORS = {
  casual:    { bg: "bg-blue-100",   text: "text-blue-700",   dot: "#3b82f6" },
  sick:      { bg: "bg-emerald-100", text: "text-emerald-700", dot: "#10b981" },
  optional:  { bg: "bg-amber-100",  text: "text-amber-700",  dot: "#f59e0b" },
  maternity: { bg: "bg-pink-100",   text: "text-pink-700",   dot: "#ec4899" },
  paternity: { bg: "bg-purple-100", text: "text-purple-700", dot: "#8b5cf6" },
  special:   { bg: "bg-orange-100", text: "text-orange-700", dot: "#f97316" },
  lop:       { bg: "bg-gray-100",   text: "text-gray-700",   dot: "#6b7280" },
};

const STATUS_STYLES = {
  pending:             { bg: "bg-yellow-50 border-yellow-200",  text: "text-yellow-700",  dot: "#f59e0b" },
  approved:            { bg: "bg-green-50 border-green-200",   text: "text-green-700",   dot: "#10b981" },
  rejected:            { bg: "bg-red-50 border-red-200",       text: "text-red-700",     dot: "#ef4444" },
  cancelled:           { bg: "bg-gray-50 border-gray-200",     text: "text-gray-600",    dot: "#9ca3af" },
  approved_by_manager: { bg: "bg-blue-50 border-blue-200",     text: "text-blue-700",    dot: "#3b82f6" },
};

const BALANCE_CARDS = [
  { key: "casual",    label: "Casual",    icon: MdBeachAccess,    color: "#3b82f6", gradient: "from-blue-500 to-blue-600",    bg: "from-blue-50 to-blue-100" },
  { key: "sick",      label: "Sick",      icon: MdLocalHospital,  color: "#10b981", gradient: "from-emerald-500 to-emerald-600", bg: "from-emerald-50 to-emerald-100" },
  { key: "optional",  label: "Optional",  icon: MdStar,           color: "#f59e0b", gradient: "from-amber-500 to-amber-600",  bg: "from-amber-50 to-amber-100" },
];

function getLeaveTypeLabel(leave) {
  if (leave.leave_type !== "special") return leave.leave_type;
  const isWeekendReq = (leave.reason || "").toLowerCase().startsWith("weekend work request:");
  return isWeekendReq ? "weekend work request" : "compensate leave";
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const fmtDays = (n) => Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(1);

export default function LeavesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, balance, loading } = useSelector((s) => s.leaves);
  const [filter, setFilter] = useState({ status: "", leave_type: "", year: new Date().getFullYear() });
  const [yearLeaves, setYearLeaves] = useState([]);

  useEffect(() => {
    dispatch(fetchLeaves(filter));
    dispatch(fetchBalance(filter.year));
  }, [dispatch, filter]);

  useEffect(() => {
    getLeaves({ year: filter.year })
      .then((res) => setYearLeaves(res.data || []))
      .catch(() => setYearLeaves([]));
  }, [filter.year]);

  const appliedByType = useMemo(() => {
    const byType = {};
    for (const leave of yearLeaves) {
      if (["rejected", "cancelled"].includes(leave.status)) continue;
      const key = leave.leave_type;
      byType[key] = (byType[key] || 0) + Number(leave.total_days || 0);
    }
    return byType;
  }, [yearLeaves]);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Leaves</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track and manage your leave requests</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/leaves/apply")}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow text-sm">
          <MdAdd className="text-lg" /> Apply Leave
        </motion.button>
      </motion.div>

      {/* Balance cards */}
      {balance && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BALANCE_CARDS.map((b) => {
            const used  = appliedByType[b.key] ?? (balance[`${b.key}_used`] || 0);
            const total = balance[`${b.key}_total`] || 0;
            const avail = Math.max(0, total - used);
            const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0;
            const Icon  = b.icon;
            return (
              <motion.div key={b.key} whileHover={{ y: -3 }}
                className={`bg-gradient-to-br ${b.bg} border border-white rounded-2xl p-5 shadow-sm relative overflow-hidden`}>
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20"
                  style={{ background: b.color }} />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: `${b.color}20` }}>
                    <Icon className="text-xl" style={{ color: b.color }} />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/70 text-gray-600">
                    {fmtDays(used)}/{fmtDays(total)}
                  </span>
                </div>
                <p className="text-3xl font-extrabold" style={{ color: b.color }}>{fmtDays(used)}/{fmtDays(total)}</p>
                <p className="text-sm font-medium text-gray-600 mt-0.5">{b.label} Leave Applied</p>
                <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ background: b.color }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">{fmtDays(avail)} day(s) remaining</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-400">
          <MdFilterList className="text-xl" />
          <span className="text-sm font-medium text-gray-500">Filter:</span>
        </div>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="input-field w-44 text-sm">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filter.leave_type} onChange={(e) => setFilter({ ...filter, leave_type: e.target.value })}
          className="input-field w-40 text-sm">
          <option value="">All Types</option>
          <option value="casual">Casual</option>
          <option value="sick">Sick</option>
          <option value="optional">Optional</option>
          <option value="maternity">Maternity</option>
          <option value="paternity">Paternity</option>
          <option value="special">Special</option>
          <option value="lop">Leave Without Pay</option>
        </select>
        <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })}
          className="input-field w-28 text-sm">
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <AnimatePresence>
          {(filter.status || filter.leave_type) && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setFilter({ ...filter, status: "", leave_type: "" })}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              <MdClose className="text-sm" /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Table / Content */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full mb-3" />
            <p className="text-sm">Loading leaves...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdEventNote className="text-blue-400 text-3xl" />
            </div>
            <p className="text-gray-700 font-semibold">No leave requests found</p>
            <p className="text-gray-400 text-sm mt-1">Apply for a leave to get started</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/leaves/apply")}
              className="mt-5 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25">
              Apply Leave
            </motion.button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Type", "From", "To", "Days", "Reason", "Status", "Remarks", "Approved By", "Approved On", "Applied On"].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((l, i) => {
                  const lc = LEAVE_COLORS[l.leave_type] || { bg: "bg-gray-100", text: "text-gray-600" };
                  const sc = STATUS_STYLES[l.status] || STATUS_STYLES.cancelled;
                  return (
                    <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/60 hover:bg-blue-50/40"}`}>
                      <td className="px-4 py-3.5 text-gray-300 font-mono text-xs">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${lc.bg} ${lc.text}`}>
                          {getLeaveTypeLabel(l)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{l.start_date}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{l.end_date}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-gray-900">{l.total_days}</span>
                        <span className="text-gray-400 text-xs ml-1">day{l.total_days !== 1 ? "s" : ""}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 max-w-[180px] truncate">{l.reason}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                          {l.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        {(l.status === "rejected") && (l.manager_comment || l.main_manager_comment) ? (
                          <div className="flex items-start gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                            <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">✕</span>
                            <span className="text-red-700 text-xs font-medium leading-snug">
                              {l.manager_comment || l.main_manager_comment}
                            </span>
                          </div>
                        ) : l.status === "approved" && (l.manager_comment || l.main_manager_comment) ? (
                          <div className="flex items-start gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                            <span className="text-green-500 text-xs mt-0.5 flex-shrink-0">✓</span>
                            <span className="text-green-700 text-xs font-medium leading-snug">
                              {l.manager_comment || l.main_manager_comment}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {(() => {
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
                        {format(new Date(l.created_at), "dd MMM yyyy")}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
