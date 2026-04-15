import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from "../services/api";
import { MdAdd, MdEdit, MdDelete, MdHolidayVillage, MdClose } from "react-icons/md";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

const MONTH_BG = [
  "from-blue-500 to-cyan-400","from-violet-500 to-purple-400","from-pink-500 to-rose-400",
  "from-orange-500 to-amber-400","from-green-500 to-emerald-400","from-teal-500 to-cyan-500",
  "from-indigo-500 to-blue-400","from-yellow-500 to-amber-400","from-red-500 to-pink-400",
  "from-purple-500 to-violet-400","from-blue-600 to-indigo-500","from-green-600 to-teal-500",
];

export default function HolidaysPage() {
  const { user } = useSelector((s) => s.auth);
  const isAdmin = ["admin", "main_manager", "hr"].includes(user?.role);
  const [holidays, setHolidays] = useState([]);
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", date: "", holiday_type: "mandatory", description: "", year });

  async function loadYears() {
    try {
      const r = await getHolidays();
      const years = [...new Set(r.data.map((h) => h.year))].sort((a, b) => a - b);
      if (years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(year)) setYear(years[years.length - 1]);
      }
    } catch {}
  }

  async function load() {
    try { const r = await getHolidays(year); setHolidays(r.data); } catch {}
  }

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { load(); }, [year]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      editing ? await updateHoliday(editing.id, { ...form, year: parseInt(form.year) })
               : await createHoliday({ ...form, year: parseInt(form.year) });
      toast.success(editing ? "Holiday updated" : "Holiday added");
      setShowForm(false); setEditing(null);
      setForm({ name: "", date: "", holiday_type: "mandatory", description: "", year });
      loadYears();
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this holiday?")) return;
    try { await deleteHoliday(id); toast.success("Deleted"); loadYears(); load(); } catch {}
  }

  const grouped = {};
  holidays.forEach((h) => {
    const m = new Date(h.date + "T00:00:00").getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  const mandatory = holidays.filter((h) => h.holiday_type === "mandatory");
  const optional  = holidays.filter((h) => h.holiday_type === "optional");

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 pb-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Company Holidays</h1>
          <p className="text-gray-400 text-sm mt-0.5">Official holidays and optional leaves calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="input-field w-28 font-semibold">
            {availableYears.map((y) => <option key={y}>{y}</option>)}
          </select>
          {isAdmin && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setEditing(null); setForm({ name:"",date:"",holiday_type:"mandatory",description:"",year }); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/30">
              <MdAdd className="text-lg" /> Add Holiday
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 gap-4">
        {[
          { label:"Mandatory Holidays", count: mandatory.length, gradient:"linear-gradient(135deg,#667eea,#764ba2)", icon:"🎯", desc:"Compulsory for all employees" },
          { label:"Optional Holidays",  count: optional.length,  gradient:"linear-gradient(135deg,#f093fb,#f5576c)", icon:"⭐", desc:"Choose any 2 per year" },
        ].map((c) => (
          <motion.div key={c.label} variants={fadeUp} whileHover={{ y: -3 }}
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
            style={{ background: c.gradient }}>
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative z-10 flex items-center gap-4">
              <span className="text-4xl">{c.icon}</span>
              <div>
                <p className="text-4xl font-extrabold">{c.count}</p>
                <p className="font-semibold text-white/90">{c.label}</p>
                <p className="text-xs text-white/70 mt-0.5">{c.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Month-wise holidays */}
      <div className="space-y-5">
        {Object.keys(grouped).sort((a, b) => a - b).map((month) => (
          <motion.div key={month} variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Month header */}
            <div className={`bg-gradient-to-r ${MONTH_BG[month]} px-5 py-3 flex items-center justify-between`}>
              <h3 className="font-bold text-white text-base">{MONTHS[month]}</h3>
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {grouped[month].length} holiday{grouped[month].length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="p-4 space-y-2">
              {grouped[month].map((h, i) => {
                const d = new Date(h.date + "T00:00:00");
                const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
                return (
                  <motion.div key={h.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    {/* Date badge */}
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 shadow-md bg-gradient-to-br ${MONTH_BG[month]}`}>
                      <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
                      <span className="text-xs opacity-80">{MONTHS[month].slice(0,3)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{h.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.holiday_type === "mandatory"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-pink-100 text-pink-700"
                        }`}>
                          {h.holiday_type === "mandatory" ? "🎯 Mandatory" : "⭐ Optional"}
                        </span>
                        <span className="text-xs text-gray-400">{dayName}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => { setEditing(h); setForm({ name:h.name,date:h.date,holiday_type:h.holiday_type,description:h.description||"",year:h.year }); setShowForm(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <MdEdit />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(h.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <MdDelete />
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}

        {holidays.length === 0 && (
          <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16">
            <span className="text-6xl">📅</span>
            <p className="text-gray-500 font-medium mt-3">No holidays for {year}</p>
            {isAdmin && <p className="text-gray-400 text-sm mt-1">Click "Add Holiday" to get started</p>}
          </motion.div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-5 flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">{editing ? "Edit Holiday" : "Add Holiday"}</h3>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white transition-colors">
                  <MdClose className="text-xl" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Holiday Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required placeholder="e.g., Diwali" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["mandatory","optional"].map((t) => (
                      <button key={t} type="button"
                        onClick={() => setForm({ ...form, holiday_type: t })}
                        className={`py-2.5 rounded-xl border-2 font-medium text-sm capitalize transition-all ${
                          form.holiday_type === t
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}>
                        {t === "mandatory" ? "🎯 Mandatory" : "⭐ Optional"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional note..." className="input-field" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
                    {editing ? "Update Holiday" : "Add Holiday"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
