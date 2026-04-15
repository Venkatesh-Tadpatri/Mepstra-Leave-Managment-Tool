import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getAllowedEmails, addAllowedEmail, removeAllowedEmail } from "../services/api";
import { MdEmail, MdAdd, MdDelete, MdClose, MdSearch, MdShield } from "react-icons/md";

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

export default function AllowedEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", notes: "" });
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    try {
      const res = await getAllowedEmails();
      setEmails(res.data);
    } catch {
      toast.error("Failed to load allowed emails");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    setLoading(true);
    try {
      await addAllowedEmail({ email: form.email.trim().toLowerCase(), notes: form.notes || undefined });
      toast.success("Email added to whitelist");
      setForm({ email: "", notes: "" });
      setAdding(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add email");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(entry) {
    if (!confirm(`Remove ${entry.email} from the whitelist?`)) return;
    setDeletingId(entry.id);
    try {
      await removeAllowedEmail(entry.id);
      toast.success("Email removed from whitelist");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove email");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = emails.filter((e) =>
    !search || e.email.toLowerCase().includes(search.toLowerCase()) || (e.notes || "").toLowerCase().includes(search.toLowerCase())
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
          <MdAdd className="text-lg" /> Add Email
        </motion.button>
      </motion.div>

      {/* Info banner */}
      <motion.div variants={fadeUp} className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm text-blue-800">
        <MdShield className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">How the whitelist works</p>
          <p className="text-blue-700 mt-0.5">
            When this list has entries, only those exact email addresses may create accounts.
            If the list is empty, only domain-level validation is applied (@mepstra.com / @mepsrta.com / allowed Gmail).
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <MdSearch className="text-gray-400 text-xl flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or notes..."
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
                {["#", "Email Address", "Notes", "Added On", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3 text-gray-300 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MdEmail className="text-blue-600 text-sm" />
                      </div>
                      <span className="font-semibold text-gray-900">{entry.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{entry.notes || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemove(entry)}
                      disabled={deletingId === entry.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      <MdDelete />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <MdEmail className="text-gray-200 text-5xl mx-auto mb-3" />
                    <p className="text-gray-400">
                      {search ? "No matching emails" : "No emails in whitelist — domain validation is active"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add email drawer */}
      <AnimatePresence>
        {adding && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAdding(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 py-5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <MdEmail className="text-blue-300 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base">Add to Whitelist</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Allow this email to register</p>
                  </div>
                </div>
                <button onClick={() => setAdding(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <MdClose />
                </button>
              </div>

              <form onSubmit={handleAdd} className="flex flex-col flex-1 p-5 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="employee@mepstra.com"
                    required
                    className="input-field text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. New hire - Engineering"
                    className="input-field text-sm"
                  />
                </div>

                <div className="mt-auto">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
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
