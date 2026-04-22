import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getAllowedEmails, addAllowedEmail, updateAllowedEmail, removeAllowedEmail } from "../services/api";
import {
  MdEmail, MdAdd, MdDelete, MdClose, MdSearch, MdShield,
  MdPerson, MdEdit, MdCheck, MdWarning,
} from "react-icons/md";
import { SiGmail } from "react-icons/si";

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const EMPTY_FORM = { employee_name: "", outlook_email: "", gmail: "", casual_leaves: 12, sick_leaves: 6, optional_leaves: 2 };
const EMPTY_ERRORS = { outlook_email: "", gmail: "" };

function ConfirmModal({ name, onConfirm, onCancel }) {
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
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <MdWarning className="text-red-500 text-3xl" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 mb-1">Remove Employee</h3>
          <p className="text-sm text-gray-500">
            Are you sure you want to remove <span className="font-semibold text-gray-800">{name}</span> from the whitelist? They will no longer be able to register.
          </p>
        </div>
        <div className="flex gap-3 px-6 py-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AllowedEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [formErrors, setFormErrors] = useState(EMPTY_ERRORS);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmEntry, setConfirmEntry] = useState(null);
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
    const errs = { outlook_email: "", gmail: "" };
    const outlook = form.outlook_email.trim().toLowerCase();
    const gmail = form.gmail.trim().toLowerCase();

    if (!outlook && !gmail) {
      toast.error("Enter at least one email");
      return;
    }
    if (outlook && !outlook.endsWith("@mepstra.com")) {
      errs.outlook_email = "Must be a @mepstra.com email address";
    }
    if (outlook && gmail && outlook === gmail) {
      errs.gmail = "Office email must be different from the Outlook email";
    }
    if (errs.outlook_email || errs.gmail) {
      setFormErrors(errs);
      return;
    }
    setFormErrors(EMPTY_ERRORS);
    setLoading(true);
    try {
      await addAllowedEmail({
        employee_name: form.employee_name.trim(),
        outlook_email: outlook || undefined,
        gmail: gmail || undefined,
        casual_leaves: Number(form.casual_leaves),
        sick_leaves: Number(form.sick_leaves),
        optional_leaves: Number(form.optional_leaves),
      });
      toast.success("Employee added to whitelist");
      setForm(EMPTY_FORM);
      setFormErrors(EMPTY_ERRORS);
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
        casual_leaves: Number(editForm.casual_leaves),
        sick_leaves: Number(editForm.sick_leaves),
        optional_leaves: Number(editForm.optional_leaves),
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
    setConfirmEntry(entry);
  }

  async function confirmRemove() {
    const entry = confirmEntry;
    setConfirmEntry(null);
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
      casual_leaves: entry.casual_leaves ?? 12,
      sick_leaves: entry.sick_leaves ?? 6,
      optional_leaves: entry.optional_leaves ?? 2,
    });
  }

  const filtered = emails.filter(
    (e) =>
      !search ||
      (e.employee_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.outlook_email || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.gmail || "").toLowerCase().includes(search.toLowerCase())
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
            Each employee gets one row with their Outlook and/or Office email. They can register using either email,
            but only once. If they register with Outlook, their Office email is automatically blocked and vice versa.
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <MdSearch className="text-gray-400 text-xl flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
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
                  <span className="flex items-center gap-1.5"><SiGmail className="text-red-500" /> Office Email</span>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Leave Quota</th>
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
                  className={`border-b border-gray-100 transition-colors ${i % 2 === 0 ? "bg-white hover:bg-blue-50/30" : "bg-slate-50/60 hover:bg-blue-50/40"}`}
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

                  {/* Leave Quota */}
                  <td className="px-4 py-3">
                    {editingId === entry.id ? (
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        {[
                          { key: "casual_leaves", label: "CL" },
                          { key: "sick_leaves", label: "SL" },
                          { key: "optional_leaves", label: "OL" },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 w-5">{label}</span>
                            <input
                              type="number"
                              min={0}
                              value={editForm[key]}
                              onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="w-12 px-1.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-sky-400 text-center"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                        <span><span className="text-gray-400">CL</span> {entry.casual_leaves ?? 12}</span>
                        <span><span className="text-gray-400">SL</span> {entry.sick_leaves ?? 6}</span>
                        <span><span className="text-gray-400">OL</span> {entry.optional_leaves ?? 2}</span>
                      </div>
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
              onClick={() => { setAdding(false); setFormErrors(EMPTY_ERRORS); }}
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
                      onChange={(e) => {
                        const val = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase());
                        setForm((f) => ({ ...f, employee_name: val }));
                      }}
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
                      onChange={(e) => { setForm((f) => ({ ...f, outlook_email: e.target.value })); setFormErrors((er) => ({ ...er, outlook_email: "" })); }}
                      placeholder="employee@mepstra.com"
                      className={`input-field text-sm pl-9 ${formErrors.outlook_email ? "border-red-400 focus:border-red-400" : ""}`}
                    />
                  </div>
                  {formErrors.outlook_email && <p className="text-xs text-red-500 mt-1">{formErrors.outlook_email}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Only <span className="font-semibold text-blue-600">@mepstra.com</span> emails allowed</p>
                </div>

                {/* Office Email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MdEmail className="text-gray-500" /> Office Email
                    <span className="font-normal text-gray-400 normal-case ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="email"
                      value={form.gmail}
                      onChange={(e) => { setForm((f) => ({ ...f, gmail: e.target.value })); setFormErrors((er) => ({ ...er, gmail: "" })); }}
                      placeholder="employee@gmail.com"
                      className={`input-field text-sm pl-9 ${formErrors.gmail ? "border-red-400 focus:border-red-400" : ""}`}
                    />
                  </div>
                  {formErrors.gmail && <p className="text-xs text-red-500 mt-1">{formErrors.gmail}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">Any email accepted. Must be different from Outlook email.</p>

                </div>

                {/* Leave Quota */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Leave Quota (Days)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "casual_leaves",   label: "Casual",   color: "sky" },
                      { key: "sick_leaves",     label: "Sick",     color: "rose" },
                      { key: "optional_leaves", label: "Optional", color: "violet" },
                    ].map(({ key, label, color }) => (
                      <div key={key} className={`flex flex-col items-center bg-${color}-50 border border-${color}-100 rounded-xl p-2.5`}>
                        <label className={`text-[10px] font-semibold text-${color}-500 uppercase tracking-wide mb-1.5`}>{label}</label>
                        <input
                          type="number"
                          min={0}
                          max={365}
                          value={form[key]}
                          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                          className={`w-full text-center text-base font-extrabold text-${color}-700 bg-transparent border-b-2 border-${color}-200 focus:outline-none focus:border-${color}-500`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Adjust if joining mid-year — these become the employee's annual leave totals.</p>
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

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmEntry && (
          <ConfirmModal
            name={confirmEntry.employee_name}
            onConfirm={confirmRemove}
            onCancel={() => setConfirmEntry(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
