import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPending } from "../store/slices/leaveSlice";
import { actionLeave } from "../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { MdCheckCircle, MdCancel, MdCalendarMonth, MdClose, MdHourglassTop, MdDone } from "react-icons/md";
import { format } from "date-fns";

const LEAVE_TYPE_STYLES = {
  casual:    { bg: "bg-blue-100",    text: "text-blue-700",    dot: "#3b82f6" },
  sick:      { bg: "bg-emerald-100", text: "text-emerald-700", dot: "#10b981" },
  optional:  { bg: "bg-amber-100",  text: "text-amber-700",   dot: "#f59e0b" },
  maternity: { bg: "bg-pink-100",   text: "text-pink-700",    dot: "#ec4899" },
  paternity: { bg: "bg-purple-100", text: "text-purple-700",  dot: "#8b5cf6" },
  special:   { bg: "bg-orange-100", text: "text-orange-700",  dot: "#f97316" },
  lop:       { bg: "bg-gray-100",   text: "text-gray-600",    dot: "#6b7280" },
};

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

function getLeaveTypeLabel(leave) {
  if (leave.leave_type !== "special") return leave.leave_type;
  const isWeekendReq = (leave.reason || "").toLowerCase().startsWith("weekend work request:");
  return isWeekendReq ? "weekend work request" : "compensate leave";
}

function ActionModal({ leave, onClose, onAction }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const lc = LEAVE_TYPE_STYLES[leave.leave_type] || { bg: "bg-gray-100", text: "text-gray-600", dot: "#6b7280" };

  async function handleAction(action) {
    setLoading(true);
    try {
      await onAction(leave.id, action, comment);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Review Leave Request</h3>
            <p className="text-slate-400 text-xs mt-0.5">Approve or reject this request</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <MdClose />
          </button>
        </div>

        {/* Employee info */}
        <div className="p-5">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {leave.user?.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{leave.user?.full_name}</p>
                <p className="text-xs text-gray-400">{leave.user?.department?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-sm">
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Leave Type</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${lc.bg} ${lc.text}`}>
                  {getLeaveTypeLabel(leave)}
                </span>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                <p className="font-semibold text-gray-800">{leave.total_days} day(s)</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">From</p>
                <p className="font-semibold text-gray-800">{leave.start_date}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">To</p>
                <p className="font-semibold text-gray-800">{leave.end_date}</p>
              </div>
            </div>
            <div className="mt-2.5 bg-white rounded-lg p-2.5">
              <p className="text-xs text-gray-400 mb-1">Reason</p>
              <p className="text-sm text-gray-700">{leave.reason}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              rows={3} placeholder="Add feedback for the employee..."
              className="input-field resize-none text-sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => handleAction("reject")} disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-red-500/20 disabled:opacity-50">
            <MdCancel /> Reject
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => handleAction("approve")} disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-green-500/20 disabled:opacity-50">
            <MdCheckCircle /> Approve
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PendingApprovalsPage() {
  const dispatch = useDispatch();
  const { pending, loading } = useSelector((s) => s.leaves);
  const { user } = useSelector((s) => s.auth);
  const isHR = user?.role === "hr";
  const [selected, setSelected] = useState(null);

  useEffect(() => { dispatch(fetchPending()); }, []);

  async function handleAction(id, action, comment) {
    try {
      await actionLeave(id, { action, comment });
      toast.success(`Leave ${action}d successfully`);
      dispatch(fetchPending());
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action} leave`);
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {isHR ? "Leave Requests" : "Pending Approvals"}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isHR ? "View all leave requests (read-only access)" : "Review and action leave requests"}
          </p>
        </div>
        {!loading && pending.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <MdHourglassTop className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{pending.length} pending</span>
          </div>
        )}
      </motion.div>

      {loading ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-24 text-gray-300">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full mb-3" />
          <p className="text-sm">Loading requests...</p>
        </motion.div>
      ) : pending.length === 0 ? (
        <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MdDone className="text-green-500 text-3xl" />
          </div>
          <p className="text-gray-800 font-bold text-lg">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">No pending leave requests to review</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {pending.map((leave) => {
            const lc = LEAVE_TYPE_STYLES[leave.leave_type] || { bg: "bg-gray-100", text: "text-gray-600", dot: "#6b7280" };
            return (
              <motion.div key={leave.id} variants={fadeUp}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-start gap-4">

                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                    {leave.user?.full_name?.[0]?.toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">{leave.user?.full_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{leave.user?.department?.name || "No dept"}</p>
                      </div>
                      <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize ${lc.bg} ${lc.text}`}>
                        {leave.leave_type === "special" ? getLeaveTypeLabel(leave) : `${leave.leave_type} Leave`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <MdCalendarMonth className="text-gray-400" />
                        {leave.start_date} → {leave.end_date}
                      </div>
                      <div className="text-xs font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg">
                        {leave.total_days} day(s)
                      </div>
                      {leave.half_day && (
                        <div className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg font-medium">
                          Half day · {leave.half_day_type}
                        </div>
                      )}
                    </div>

                    {leave.reason && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{leave.reason}</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    Applied {format(new Date(leave.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                  {isHR ? (
                    <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold">
                      View Only
                    </span>
                  ) : (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setSelected(leave)}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-shadow">
                      Review Request
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <ActionModal
            leave={selected}
            onClose={() => setSelected(null)}
            onAction={handleAction}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
