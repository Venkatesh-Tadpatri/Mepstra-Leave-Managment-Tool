import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { getUsers, updateUser, getDepartments, getTeamOverridesToday, enableEmergencyOverrideToday, disableEmergencyOverrideToday, resetUserPassword, deactivateUser } from "../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { MdSearch, MdClose, MdPeople, MdFilterList, MdLockReset, MdBlock, MdCheckCircle } from "react-icons/md";

const ROLE_STYLES = {
  employee:     { bg: "bg-blue-100",   text: "text-blue-700",    label: "Employee" },
  team_lead:    { bg: "bg-teal-100",   text: "text-teal-700",    label: "Team Lead" },
  manager:      { bg: "bg-purple-100", text: "text-purple-700",  label: "Manager" },
  hr:           { bg: "bg-orange-100", text: "text-orange-700",  label: "HR" },
  main_manager: { bg: "bg-red-100",    text: "text-red-700",     label: "Main Manager" },
  admin:        { bg: "bg-gray-100",   text: "text-gray-700",    label: "Admin" },
};

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-indigo-700",
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

export default function EmployeesPage() {
  const { user: currentUser } = useSelector((s) => s.auth);
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overrideUserIds, setOverrideUserIds] = useState(new Set()); // user_ids with override ON today
  const [overrideLoadingUserId, setOverrideLoadingUserId] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [newPin, setNewPin] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [togglingActiveId, setTogglingActiveId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { user, action: "deactivate"|"activate" }
  const isAdmin = currentUser?.role === "admin";
  const canToggleEmployeeOverride = ["manager", "team_lead"].includes(currentUser?.role);
  const canToggleManagerOverride = ["admin", "main_manager"].includes(currentUser?.role);
  const departmentFromQuery = searchParams.get("department") || "";

  async function load() {
    try {
      const [uRes, dRes] = await Promise.all([getUsers(), getDepartments()]);
      setUsers(uRes.data);
      setDepartments(dRes.data);
    } catch {}
  }

  async function loadOverrides() {
    if (!["manager", "team_lead", "admin", "main_manager"].includes(currentUser?.role)) return;
    try {
      const res = await getTeamOverridesToday();
      setOverrideUserIds(new Set(res.data.user_ids));
    } catch {}
  }

  useEffect(() => { load(); loadOverrides(); }, []);

  useEffect(() => {
    setDeptFilter(departmentFromQuery);
  }, [departmentFromQuery]);

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchDept = !deptFilter || u.department_id === parseInt(deptFilter);
    return matchSearch && matchRole && matchDept;
  });

  async function handleUpdate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUser(editing.id, {
        role: editing.role,
        department_id: editing.department_id || null,
        is_active: editing.is_active,
      });
      toast.success("Employee updated");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleOverride(userId, isCurrentlyOn) {
    setOverrideLoadingUserId(userId);
    try {
      if (isCurrentlyOn) {
        await disableEmergencyOverrideToday(userId);
        setOverrideUserIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
        toast.success("Override disabled for today");
      } else {
        await enableEmergencyOverrideToday(userId);
        setOverrideUserIds((prev) => new Set([...prev, userId]));
        toast.success("Override enabled — employee can now apply backdated leave today");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update override");
    } finally {
      setOverrideLoadingUserId(null);
    }
  }

  async function handleToggleActive(u) {
    setConfirmDialog({ user: u, action: u.is_active ? "deactivate" : "activate" });
  }

  async function confirmToggleActive() {
    const u = confirmDialog.user;
    setConfirmDialog(null);
    setTogglingActiveId(u.id);
    try {
      if (u.is_active) {
        await deactivateUser(u.id);
        toast.success(`${u.full_name}'s account deactivated`);
      } else {
        await updateUser(u.id, { is_active: true });
        toast.success(`${u.full_name}'s account activated`);
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update account status");
    } finally {
      setTogglingActiveId(null);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    setResetLoading(true);
    try {
      await resetUserPassword(resetting.id, newPin);
      toast.success(`PIN reset successfully for ${resetting.full_name}`);
      setResetting(null);
      setNewPin("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset PIN");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Employees</h1>
          <p className="text-gray-400 text-sm mt-0.5">{users.length} total employees across all departments</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl">
          <MdPeople className="text-blue-500" />
          <span className="text-sm font-semibold text-blue-700">{filtered.length} shown</span>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <MdFilterList className="text-gray-400 text-xl" />
        <div className="relative flex-1 min-w-52">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input-field pl-9 text-sm" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-40 text-sm">
          <option value="">All Roles</option>
          <option value="employee">Employee</option>
          <option value="team_lead">Team Lead</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
          <option value="main_manager">Main Manager</option>
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-field w-44 text-sm">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <AnimatePresence>
          {(search || roleFilter || deptFilter) && (
            <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => { setSearch(""); setRoleFilter(""); setDeptFilter(""); }}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              <MdClose className="text-sm" /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Employee", "Role", "Department", "Joined", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const rs = ROLE_STYLES[u.role] || { bg: "bg-gray-100", text: "text-gray-700", label: u.role };
                const avatarColor = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
                return (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/70 hover:bg-blue-50/40"}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {u.profile_image ? (
                          <img
                            src={`http://localhost:8000${u.profile_image}`}
                            alt={u.full_name}
                            className="w-9 h-9 rounded-xl object-cover shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-9 h-9 bg-gradient-to-br ${avatarColor} rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}>
                            {u.full_name[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{u.full_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rs.bg} ${rs.text}`}>
                        {rs.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-sm">{u.department?.name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{u.joining_date || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        u.is_active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-green-500" : "bg-red-500"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {/* Override slot — fixed width so Deactivate/Reset PIN always align */}
                        {(canToggleEmployeeOverride || canToggleManagerOverride) && (
                          <div className="w-32 flex-shrink-0">
                            {((canToggleEmployeeOverride && u.role === "employee") ||
                              (canToggleManagerOverride && (u.role === "manager" || u.role === "hr"))) ? (() => {
                              const isOn = overrideUserIds.has(u.id);
                              const busy = overrideLoadingUserId === u.id;
                              const isManagerOverride = u.role === "manager" || u.role === "hr";
                              return (
                                <button
                                  onClick={() => handleToggleOverride(u.id, isOn)}
                                  disabled={busy}
                                  title={isOn ? "Disable emergency leave override" : "Enable emergency leave override"}
                                  className="flex items-center gap-2 disabled:opacity-60">
                                  <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isOn ? (isManagerOverride ? "bg-purple-500" : "bg-amber-500") : "bg-gray-200"}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${isOn ? "translate-x-4" : "translate-x-0"}`} />
                                  </span>
                                  <span className={`text-xs font-semibold whitespace-nowrap ${isOn ? (isManagerOverride ? "text-purple-600" : "text-amber-600") : "text-gray-400"}`}>
                                    {busy ? "..." : isOn ? "Override On" : "Override Off"}
                                  </span>
                                </button>
                              );
                            })() : (
                              <span className="text-gray-300 text-sm select-none pl-1">—</span>
                            )}
                          </div>
                        )}

                        {isAdmin && (
                          <>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggleActive(u)}
                              disabled={togglingActiveId === u.id}
                              title={u.is_active ? "Deactivate account" : "Activate account"}
                              className={`flex items-center justify-center gap-1.5 w-28 py-1.5 text-xs font-semibold rounded-lg transition-colors border disabled:opacity-50 ${
                                u.is_active
                                  ? "text-red-600 bg-red-50 hover:bg-red-100 border-red-200"
                                  : "text-green-600 bg-green-50 hover:bg-green-100 border-green-200"
                              }`}>
                              {togglingActiveId === u.id
                                ? "..."
                                : u.is_active
                                  ? <><MdBlock className="text-sm" /> Deactivate</>
                                  : <><MdCheckCircle className="text-sm" /> Activate</>
                              }
                            </motion.button>

                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => { setResetting(u); setNewPin(""); }}
                              className="flex items-center justify-center gap-1.5 w-28 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors">
                              <MdLockReset className="text-sm" /> Reset PIN
                            </motion.button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <MdPeople className="text-gray-200 text-5xl mx-auto mb-3" />
                    <p className="text-gray-400">No employees found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Reset PIN Side Panel */}
      <AnimatePresence>
        {resetting && (
          <>
            {/* backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setResetting(null); setNewPin(""); }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />

            {/* drawer */}
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">

              {/* header */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <MdLockReset className="text-red-300 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Reset PIN</h3>
                    <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[160px]">{resetting.full_name}</p>
                  </div>
                </div>
                <button onClick={() => { setResetting(null); setNewPin(""); }}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <MdClose />
                </button>
              </div>

              {/* form */}
              <form onSubmit={handleResetPassword} className="flex flex-col flex-1 p-5 gap-5">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Set a new 4-digit login PIN for this user. The change takes effect immediately.
                </p>

                {/* Email field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="text"
                    value={resetting.email}
                    disabled
                    className="input-field bg-gray-50 text-gray-500 text-sm"
                  />
                </div>

                {/* New PIN field */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Enter 4-digit PIN"
                    className="input-field text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Numbers only, exactly 4 digits</p>
                </div>

                <div className="mt-auto">
                  <motion.button
                    type="submit"
                    disabled={resetLoading || newPin.length !== 4}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    <MdLockReset className="text-lg" />
                    {resetLoading ? "Updating..." : "Update PIN"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm Deactivate/Activate Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

              <div className={`px-5 py-4 flex items-center gap-3 ${confirmDialog.action === "deactivate" ? "bg-gradient-to-r from-red-600 to-rose-600" : "bg-gradient-to-r from-green-600 to-emerald-600"}`}>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  {confirmDialog.action === "deactivate"
                    ? <MdBlock className="text-white text-xl" />
                    : <MdCheckCircle className="text-white text-xl" />
                  }
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">
                    {confirmDialog.action === "deactivate" ? "Deactivate Account" : "Activate Account"}
                  </h3>
                  <p className="text-white/70 text-xs mt-0.5">{confirmDialog.user.full_name}</p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-gray-600 text-sm leading-relaxed">
                  {confirmDialog.action === "deactivate"
                    ? <>Are you sure you want to <span className="font-semibold text-red-600">deactivate</span> <span className="font-semibold">{confirmDialog.user.full_name}</span>'s account? They will no longer be able to log in.</>
                    : <>Are you sure you want to <span className="font-semibold text-green-600">activate</span> <span className="font-semibold">{confirmDialog.user.full_name}</span>'s account? They will regain access to the portal.</>
                  }
                </p>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={confirmToggleActive}
                    className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 ${
                      confirmDialog.action === "deactivate"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/25"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 shadow-green-500/25"
                    }`}>
                    {confirmDialog.action === "deactivate"
                      ? <><MdBlock className="text-sm" /> Deactivate</>
                      : <><MdCheckCircle className="text-sm" /> Activate</>
                    }
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">Edit Employee</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{editing.full_name}</p>
                </div>
                <button onClick={() => setEditing(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <MdClose />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input value={editing.full_name} disabled className="input-field bg-gray-50 text-gray-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                  <select value={editing.role}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                    className="input-field">
                    <option value="employee">Employee</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="main_manager">Main Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                  <select value={editing.department_id || ""}
                    onChange={(e) => setEditing({ ...editing, department_id: e.target.value })}
                    className="input-field">
                    <option value="">No Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Account Active</span>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                    editing.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {editing.is_active ? "Active" : "Inactive"}
                  </span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50">
                    {loading ? "Saving..." : "Save Changes"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
