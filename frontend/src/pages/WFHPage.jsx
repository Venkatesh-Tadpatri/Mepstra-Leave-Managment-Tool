import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { getMyWFH, cancelWFH } from "../services/api";
import toast from "react-hot-toast";
import { MdHomeWork, MdCheckCircle, MdCancel, MdPending, MdBlock } from "react-icons/md";

const STATUS_CONFIG = {
  approved:  { label: "Approved",  color: "text-green-700 bg-green-50 border-green-200",  icon: MdCheckCircle },
  rejected:  { label: "Rejected",  color: "text-red-700 bg-red-50 border-red-200",        icon: MdCancel },
  pending:   { label: "Pending",   color: "text-amber-700 bg-amber-50 border-amber-200",  icon: MdPending },
  cancelled: { label: "Cancelled", color: "text-gray-500 bg-gray-50 border-gray-200",     icon: MdBlock },
};

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function fmtDate(d) {
  try { return format(parseISO(d), "dd MMM yyyy"); }
  catch { return d || "—"; }
}

function fmtDateTime(dt) {
  if (!dt) return "—";
  try {
    const safe = dt.endsWith("Z") ? dt : dt + "Z";
    return format(parseISO(safe), "dd MMM yyyy, hh:mm a");
  } catch { return dt; }
}

export default function WFHPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getMyWFH()
      .then((r) => setRequests((r.data || []).filter((w) => w.status !== "cancelled")))
      .catch(() => toast.error("Failed to load WFH requests"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    try {
      await cancelWFH(id);
      toast.success("WFH request cancelled");
      load();
    } catch {
      toast.error("Failed to cancel request");
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-5">
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Work From Home</h1>
          <p className="text-gray-400 text-sm mt-0.5">Your WFH request history</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-100 rounded-xl">
            <MdHomeWork className="text-sky-500" />
            <span className="text-sm font-semibold text-sky-700">{requests.length} Total</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
            <MdCheckCircle className="text-green-500" />
            <span className="text-sm font-semibold text-green-700">{requests.filter(r => r.status === "approved").length} Approved</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <MdPending className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{requests.filter(r => r.status === "pending").length} Pending</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
            <MdCancel className="text-red-500" />
            <span className="text-sm font-semibold text-red-700">{requests.filter(r => r.status === "rejected").length} Rejected</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <MdHomeWork className="text-5xl mb-3 text-gray-200" />
            <p className="font-medium">No WFH requests yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "From", "To", "Days", "Reason", "Status", "Approved By", "Approved On", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-sky-50/30" : "bg-slate-50/60 hover:bg-sky-50/40"}`}>
                      <td className="px-4 py-3 text-gray-500 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.start_date)}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.end_date)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.total_days}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={r.reason}>{r.reason || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                          <Icon className="text-sm" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(r.status === "approved" || r.status === "rejected") && r.manager ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {r.manager.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-700 text-sm">{r.manager.full_name}</span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(r.status === "approved" || r.status === "rejected") && r.manager_action_at ? (
                          <div className="flex flex-col">
                            <span className="text-gray-700 text-sm">{fmtDateTime(r.manager_action_at).split(", ")[0]}</span>
                            <span className="text-gray-400 text-xs">{fmtDateTime(r.manager_action_at).split(", ")[1]}</span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "pending" && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-medium transition-colors"
                          >
                            Cancel
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
    </motion.div>
  );
}
