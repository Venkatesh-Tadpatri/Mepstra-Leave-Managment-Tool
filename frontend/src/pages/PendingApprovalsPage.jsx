import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPending, fetchPendingWFH } from "../store/slices/leaveSlice";
import { actionLeave, revokeLeave, getPendingWFH, actionWFH, getLeaves, getMyWFH } from "../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { MdCheckCircle, MdCancel, MdCalendarMonth, MdClose, MdHourglassTop, MdDone, MdLaptop, MdUndo } from "react-icons/md";
import { format } from "date-fns";
import UserAvatar from "../components/common/UserAvatar";

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

function fmtLeaveType(type) {
  if (!type) return "";
  if (type === "lop") return "LOP";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getLeaveTypeLabel(leave) {
  if (leave.leave_type !== "special") return fmtLeaveType(leave.leave_type);
  const isWeekendReq = (leave.reason || "").toLowerCase().startsWith("weekend work request:");
  return isWeekendReq ? "Weekend Work Request" : "Compensate Leave";
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
              <UserAvatar name={leave.user?.full_name} profileImage={leave.user?.profile_image} size="lg" />
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

function RevokeModal({ leave, onClose, onRevoke }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const lc = LEAVE_TYPE_STYLES[leave.leave_type] || { bg: "bg-gray-100", text: "text-gray-600" };

  async function handleRevoke() {
    setLoading(true);
    try {
      await onRevoke(leave.id, comment);
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

        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Revoke Approved Leave</h3>
            <p className="text-orange-100 text-xs mt-0.5">This will restore the employee's leave balance</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <MdClose />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-start gap-2.5">
            <MdUndo className="text-orange-500 text-lg mt-0.5 flex-shrink-0" />
            <p className="text-sm text-orange-700">
              Revoking this leave will restore <strong>{leave.total_days} day(s)</strong> back to{" "}
              <strong>{leave.user?.full_name}</strong>'s {leave.leave_type} leave balance.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
            <UserAvatar name={leave.user?.full_name} profileImage={leave.user?.profile_image} size="md" />
              <div>
                <p className="font-semibold text-gray-900">{leave.user?.full_name}</p>
                <p className="text-xs text-gray-400">{leave.user?.department?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Leave Type</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${lc.bg} ${lc.text}`}>
                  {leave.leave_type}
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
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Reason for Revoke <span className="text-red-400">*</span>
            </label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              rows={3} placeholder="Explain why this approved leave is being revoked..."
              className="input-field resize-none text-sm" />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5">Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleRevoke} disabled={loading || !comment.trim()}
            className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 disabled:opacity-50">
            <MdUndo /> {loading ? "Revoking..." : "Revoke Leave"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WFHActionModal({ wfh, onClose, onAction }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(action) {
    setLoading(true);
    try {
      await onAction(wfh.id, action, comment);
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

        <div className="bg-gradient-to-r from-blue-700 to-violet-800 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Review WFH Request</h3>
            <p className="text-blue-200 text-xs mt-0.5">Approve or reject this request</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <MdClose />
          </button>
        </div>

        <div className="p-5">
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
            <UserAvatar name={wfh.user?.full_name} profileImage={wfh.user?.profile_image} size="lg" />
              <div>
                <p className="font-semibold text-gray-900">{wfh.user?.full_name}</p>
                <p className="text-xs text-gray-400">{wfh.user?.department?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-sm">
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Duration</p>
                <p className="font-semibold text-gray-800">{wfh.total_days} day(s)</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">Type</p>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Work From Home</span>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">From</p>
                <p className="font-semibold text-gray-800">{wfh.start_date}</p>
              </div>
              <div className="bg-white rounded-lg p-2.5">
                <p className="text-xs text-gray-400 mb-0.5">To</p>
                <p className="font-semibold text-gray-800">{wfh.end_date}</p>
              </div>
            </div>
            <div className="mt-2.5 bg-white rounded-lg p-2.5">
              <p className="text-xs text-gray-400 mb-1">Reason</p>
              <p className="text-sm text-gray-700">{wfh.reason}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              rows={3} placeholder="Add feedback for the employee..."
              className="input-field resize-none text-sm" />
          </div>
        </div>

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
  const isEmployee = user?.role === "employee";
  const canRevoke = ["manager", "team_lead", "main_manager", "admin"].includes(user?.role);

  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("leave");
  const [wfhPending, setWfhPending] = useState([]);
  const [wfhLoading, setWfhLoading] = useState(false);
  const [selectedWFH, setSelectedWFH] = useState(null);

  // Approved leaves for revoke tab
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [selectedRevoke, setSelectedRevoke] = useState(null);

  // Employee-specific: own pending leaves/WFH
  const [myPendingLeaves, setMyPendingLeaves] = useState([]);
  const [myPendingWFH, setMyPendingWFH] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  useEffect(() => {
    if (isEmployee) {
      setMyLoading(true);
      Promise.all([
        getLeaves({ status: "pending" }),
        getMyWFH(),
      ])
        .then(([leavesRes, wfhRes]) => {
          setMyPendingLeaves(leavesRes.data);
          setMyPendingWFH((wfhRes.data || []).filter((w) => w.status === "pending"));
        })
        .catch(() => {})
        .finally(() => setMyLoading(false));
    } else {
      dispatch(fetchPending());
    }
  }, [isEmployee]);

  useEffect(() => {
    if (isEmployee) return;
    setWfhLoading(true);
    getPendingWFH()
      .then((r) => {
        setWfhPending(r.data);
        dispatch(fetchPendingWFH());
      })
      .catch(() => {})
      .finally(() => setWfhLoading(false));
  }, [isEmployee]);

  function loadApprovedLeaves() {
    setApprovedLoading(true);
    getLeaves({ status: "approved", team: true })
      .then((r) => setApprovedLeaves(r.data))
      .catch(() => {})
      .finally(() => setApprovedLoading(false));
  }

  useEffect(() => {
    if (canRevoke) loadApprovedLeaves();
  }, [canRevoke]);

  async function handleAction(id, action, comment) {
    try {
      await actionLeave(id, { action, comment });
      toast.success(`Leave ${action}d successfully`);
      dispatch(fetchPending());
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action} leave`);
    }
  }

  async function handleRevoke(id, comment) {
    try {
      await revokeLeave(id, comment);
      toast.success("Leave revoked — balance restored to employee");
      setApprovedLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to revoke leave");
    }
  }

  async function handleWFHAction(id, action, comment) {
    try {
      await actionWFH(id, { action, comment });
      toast.success(`WFH request ${action}d successfully`);
      setWfhPending((prev) => prev.filter((r) => r.id !== id));
      dispatch(fetchPendingWFH());
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action} WFH request`);
    }
  }

  const leavePendingCount = isEmployee ? myPendingLeaves.length : pending.length;
  const wfhPendingCount  = isEmployee ? myPendingWFH.length   : wfhPending.length;
  const totalPending = leavePendingCount + wfhPendingCount;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {isEmployee ? "My Pending Requests" : isHR ? "Leave Requests" : "Pending Approvals"}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isEmployee
              ? "Leave and WFH requests awaiting approval"
              : isHR
              ? "View all leave requests (read-only access)"
              : "Review and action leave requests"}
          </p>
        </div>
        {totalPending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <MdHourglassTop className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{totalPending} pending</span>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("leave")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "leave" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MdCalendarMonth />
          Leave Requests
          {leavePendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
              {leavePendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("wfh")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "wfh" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <MdLaptop />
          WFH Requests
          {wfhPendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {wfhPendingCount}
            </span>
          )}
        </button>
        {canRevoke && (
          <button
            onClick={() => setActiveTab("approved")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "approved" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MdUndo />
            Approved Leaves
            {approvedLeaves.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                {approvedLeaves.length}
              </span>
            )}
          </button>
        )}
      </motion.div>

      {/* Leave Requests Tab */}
      {activeTab === "leave" && (
        (isEmployee ? myLoading : loading) ? (
          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-24 text-gray-300">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full mb-3" />
            <p className="text-sm">Loading requests...</p>
          </motion.div>
        ) : leavePendingCount === 0 ? (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdDone className="text-green-500 text-3xl" />
            </div>
            <p className="text-gray-800 font-bold text-lg">All caught up!</p>
            <p className="text-gray-400 text-sm mt-1">
              {isEmployee ? "No pending leave requests" : "No pending leave requests to review"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {(isEmployee ? myPendingLeaves : pending).map((leave) => {
              const lc = LEAVE_TYPE_STYLES[leave.leave_type] || { bg: "bg-gray-100", text: "text-gray-600", dot: "#6b7280" };
              return (
                <motion.div key={leave.id} variants={fadeUp}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      name={isEmployee ? user?.full_name : leave.user?.full_name}
                      profileImage={isEmployee ? user?.profile_image : leave.user?.profile_image}
                      size="xl"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">
                            {isEmployee ? user?.full_name : leave.user?.full_name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {isEmployee ? user?.department?.name : leave.user?.department?.name || "No dept"}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold capitalize ${lc.bg} ${lc.text}`}>
                          {leave.leave_type === "special" ? getLeaveTypeLabel(leave) : `${fmtLeaveType(leave.leave_type)} Leave`}
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400">
                      Applied {format(new Date(leave.created_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                    {isEmployee ? (
                      <span className="px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                        <MdHourglassTop className="text-amber-500" /> Awaiting Approval
                      </span>
                    ) : isHR ? (
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
        )
      )}

      {/* WFH Requests Tab */}
      {activeTab === "wfh" && (
        (isEmployee ? myLoading : wfhLoading) ? (
          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-24 text-gray-300">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full mb-3" />
            <p className="text-sm">Loading WFH requests...</p>
          </motion.div>
        ) : wfhPendingCount === 0 ? (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdLaptop className="text-blue-400 text-3xl" />
            </div>
            <p className="text-gray-800 font-bold text-lg">No pending WFH requests</p>
            <p className="text-gray-400 text-sm mt-1">
              {isEmployee ? "No pending work from home requests" : "All work from home requests have been reviewed"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {(isEmployee ? myPendingWFH : wfhPending).map((wfh) => (
              <motion.div key={wfh.id} variants={fadeUp}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                <div className="flex items-start gap-4">
                  <UserAvatar
                    name={isEmployee ? user?.full_name : wfh.user?.full_name}
                    profileImage={isEmployee ? user?.profile_image : wfh.user?.profile_image}
                    size="xl"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-gray-900">
                          {isEmployee ? user?.full_name : wfh.user?.full_name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isEmployee ? user?.department?.name : wfh.user?.department?.name || "No dept"}
                        </p>
                      </div>
                      <span className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        Work From Home
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <MdCalendarMonth className="text-gray-400" />
                        {wfh.start_date} → {wfh.end_date}
                      </div>
                      <div className="text-xs font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-lg">
                        {wfh.total_days} day(s)
                      </div>
                    </div>
                    {wfh.reason && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{wfh.reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    Applied {format(new Date(wfh.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                  {isEmployee ? (
                    <span className="px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                      <MdHourglassTop className="text-amber-500" /> Awaiting Approval
                    </span>
                  ) : isHR ? (
                    <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-xs font-semibold">
                      View Only
                    </span>
                  ) : (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedWFH(wfh)}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-shadow">
                      Review Request
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* Approved Leaves Tab — Revoke */}
      {activeTab === "approved" && canRevoke && (
        approvedLoading ? (
          <motion.div variants={fadeUp} className="flex flex-col items-center justify-center py-24 text-gray-300">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full mb-3" />
            <p className="text-sm">Loading approved leaves...</p>
          </motion.div>
        ) : approvedLeaves.length === 0 ? (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdCheckCircle className="text-emerald-500 text-3xl" />
            </div>
            <p className="text-gray-800 font-bold text-lg">No approved leaves</p>
            <p className="text-gray-400 text-sm mt-1">No approved leaves found for your team</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-100 rounded-xl">
              <MdUndo className="text-orange-500 flex-shrink-0" />
              <p className="text-sm text-orange-700">
                Revoking a leave will <strong>restore the employee's balance</strong> and notify them by email.
              </p>
            </div>
            {approvedLeaves.map((leave) => {
              const lc = LEAVE_TYPE_STYLES[leave.leave_type] || { bg: "bg-gray-100", text: "text-gray-600", dot: "#6b7280" };
              return (
                <motion.div key={leave.id} variants={fadeUp}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
                  <div className="flex items-start gap-4">
                    <UserAvatar name={leave.user?.full_name} profileImage={leave.user?.profile_image} size="xl" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-900">{leave.user?.full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{leave.user?.department?.name || "No dept"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${lc.bg} ${lc.text}`}>
                            {fmtLeaveType(leave.leave_type)} Leave
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            Approved
                          </span>
                        </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400">
                      Approved on {leave.manager_action_at
                        ? format(new Date(leave.manager_action_at), "dd MMM yyyy, hh:mm a")
                        : "—"}
                    </p>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedRevoke(leave)}
                      className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 transition-shadow flex items-center gap-2">
                      <MdUndo /> Revoke Leave
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
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

      <AnimatePresence>
        {selectedWFH && (
          <WFHActionModal
            wfh={selectedWFH}
            onClose={() => setSelectedWFH(null)}
            onAction={handleWFHAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRevoke && (
          <RevokeModal
            leave={selectedRevoke}
            onClose={() => setSelectedRevoke(null)}
            onRevoke={handleRevoke}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
