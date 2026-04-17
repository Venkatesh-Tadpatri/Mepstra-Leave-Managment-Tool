import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getAllowedEmails, addAllowedEmail, updateAllowedEmail, removeAllowedEmail } from "../services/api";
import {
  MdEmail, MdAdd, MdDelete, MdClose, MdSearch, MdShield,
  MdPerson, MdEdit, MdCheck,
} from "react-icons/md";
import { SiGmail } from "react-icons/si";

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const EMPTY_FORM = { employee_name: "", outlook_email: "", gmail: "", notes: "" };

export default function AllowedEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    try {
      const res = await getAllowedEmails();
      setEmails(res.data);
    } catch {
      toast.error("Failed to load whitelist");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.outlook_email && !form.gmail) {
      toast.error("Enter at least one email (Outlook or Gmail)");
      return;
    }
    setLoading(true);
    try {
      await addAllowedEmail({
        employee_name: form.employee_name.trim(),
        outlook_email: form.outlook_email.trim().toLowerCase() || undefined,
        gmail: form.gmail.trim().toLowerCase() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Employee added to whitelist");
      setForm(EMPTY_FORM);
      setAdding(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(entry) {
    setSavingId(entry.id);
    try {
      await updateAllowedEmail(entry.id, {
        outlook_email: editForm.outlook_email?.trim().toLowerCase() || null,
        gmail: editForm.gmail?.trim().toLowerCase() || null,
        notes: editForm.notes?.trim() || null,
      });
      toast.success("Updated");
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove(entry) {
    if (!confirm(`Remove ${entry.employee_name} from the whitelist?`)) return;
    setDeletingId(entry.id);
    try {
      await removeAllowedEmail(entry.id);
      toast.success("Removed from whitelist");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditForm({
      outlook_email: entry.outlook_email || "",
      gmail: entry.gmail || "",
      notes: entry.notes || "",
    });
  }

  const filtered = emails.filter(
    (e) =>
      !search ||
      (e.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.outlook_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.gmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Registration Whitelist</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Only emails in this list can register. If the list is empty, domain-based validation applies.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 text-sm"
        >
          <MdAdd className="text-lg" /> Add Employee
        </motion.button>
      </motion.div>

      {/* Info banner */}
      <motion.div variants={fadeUp} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
        <MdShield className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">How the whitelist works</p>
          <p className="text-blue-700 mt-0.5">
            Each employee gets one row with their Outlook and/or Gmail. They can register using either email,
            but only once. If they register with Outlook, their Gmail is automatically blocked and vice versa.
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <MdSearch className="text-gray-400 text-xl flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or notes..."
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
            <MdClose />
          </button>
        )}
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">#</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Employee Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><MdEmail className="text-blue-600" /> Outlook Email</span>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><SiGmail className="text-red-500" /> Gmail</span>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Added On</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{i + 1}</td>

                  {/* Employee Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MdPerson className="text-violet-600 text-sm" />
                      </div>
                      <span className="font-semibold text-gray-900">{entry.employee_name}</span>
                    </div>
                  </td>

                  {/* Outlook Email */}
                  <td className="px-4 py-3">
                    {editingId === entry.id ? (
                      <div className="relative">
                        <MdEmail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 text-xs" />
                        <input
                          type="email"
                          value={editForm.outlook_email}
                          onChange={(e) => setEditForm((f) => ({ ...f, outlook_email: e.target.value }))}
                          placeholder="outlook@mepstra.com"
                          className="w-full pl-7 pr-2 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-blue-50"
                        />
                      </div>
                    ) : entry.outlook_email ? (
                      <div className="flex items-center gap-1.5">
                        <MdEmail className="text-blue-500 text-xs flex-shrink-0" />
                        <span className="text-gray-700 text-xs">{entry.outlook_email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs italic">Not added</span>
                    )}
                  </td>

                  {/* Gmail */}
                  <td className="px-4 py-3">
                    {editingId === entry.id ? (
                      <div className="relative">
                        <SiGmail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500 text-xs" />
                        <input
                          type="email"
                          value={editForm.gmail}
                          onChange={(e) => setEditForm((f) => ({ ...f, gmail: e.target.value }))}
                          placeholder="name@gmail.com"
                          className="w-full pl-7 pr-2 py-1.5 text-xs border border-red-300 rounded-lg focus:outline-none focus:border-red-400 bg-red-50"
                        />
                      </div>
                    ) : entry.gmail ? (
                      <div className="flex items-center gap-1.5">
                        <SiGmail className="text-red-500 text-xs flex-shrink-0" />
                        <span className="text-gray-700 text-xs">{entry.gmail}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs italic">Not added</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3">
                    {editingId === entry.id ? (
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Notes"
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                      />
                    ) : (
                      <span className="text-gray-500 text-xs">{entry.notes || <span className="text-gray-300">—</span>}</span>
                    )}
                  </td>

                  {/* Added On */}
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {editingId === entry.id ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleSaveEdit(entry)}
                            disabled={savingId === entry.id}
                            className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            <MdCheck className="text-base" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => setEditingId(null)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <MdClose className="text-base" />
                          </motion.button>
                        </>
                      ) : (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => startEdit(entry)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit emails"
                          >
                            <MdEdit className="text-base" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleRemove(entry)}
                            disabled={deletingId === entry.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remove"
                          >
                            <MdDelete className="text-base" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <MdEmail className="text-gray-200 text-5xl mx-auto mb-3" />
                    <p className="text-gray-400">
                      {search ? "No matching employees" : "No employees in whitelist — domain validation is active"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Employee Drawer */}
      <AnimatePresence>
        {adding && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAdding(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <MdPerson className="text-blue-300 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Add Employee</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Allow this employee to register</p>
                  </div>
                </div>
                <button onClick={() => setAdding(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <MdClose />
                </button>
              </div>

              <form onSubmit={handleAdd} className="flex flex-col flex-1 p-5 gap-5 overflow-y-auto">

                {/* Employee Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Employee Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <input
                      type="text"
                      value={form.employee_name}
                      onChange={(e) => setForm((f) => ({ ...f, employee_name: e.target.value }))}
                      placeholder="e.g. Venkatesh Tadpatri"
                      required
                      className="input-field text-sm pl-9"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Outlook Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MdEmail className="text-blue-600" /> Outlook Email
                    <span className="font-normal text-gray-400 normal-case ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 text-sm" />
                    <input
                      type="email"
                      value={form.outlook_email}
                      onChange={(e) => setForm((f) => ({ ...f, outlook_email: e.target.value }))}
                      placeholder="employee@mepstra.com"
                      className="input-field text-sm pl-9"
                    />
                  </div>
                </div>

                {/* Gmail */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <SiGmail className="text-red-500" /> Gmail
                    <span className="font-normal text-gray-400 normal-case ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <SiGmail className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-sm" />
                    <input
                      type="email"
                      value={form.gmail}
                      onChange={(e) => setForm((f) => ({ ...f, gmail: e.target.value }))}
                      placeholder="employee@gmail.com"
                      className="input-field text-sm pl-9"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Employee can register with either email, but only once.</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. New hire — Engineering"
                    className="input-field text-sm"
                  />
                </div>

                <div className="mt-auto">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <MdAdd className="text-lg" />
                    {loading ? "Adding..." : "Add to Whitelist"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
