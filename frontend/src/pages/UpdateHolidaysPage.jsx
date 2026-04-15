import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { bulkCreateHolidays, getHolidays, updateHoliday, deleteHoliday } from "../services/api";
import { MdAdd, MdDelete, MdCalendarMonth, MdCheckCircle, MdEdit, MdSave, MdClose, MdAutoAwesome } from "react-icons/md";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const MONTH_COLORS = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-pink-500 to-rose-400",
  "from-orange-500 to-amber-400",
  "from-green-500 to-emerald-400",
  "from-teal-500 to-cyan-500",
  "from-indigo-500 to-blue-400",
  "from-yellow-500 to-amber-400",
  "from-red-500 to-pink-400",
  "from-purple-500 to-violet-400",
  "from-blue-600 to-indigo-500",
  "from-green-600 to-teal-500",
];

function emptyRow() {
  return { date: "", day: "", name: "", holiday_type: "mandatory" };
}

function getDayFromDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return isNaN(d) ? "" : DAYS[d.getDay()];
}

export default function UpdateHolidaysPage() {
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);

  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [existingHolidays, setExistingHolidays] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  function updateRow(index, field, value) {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "date") updated[index].day = getDayFromDate(value);
      return updated;
    });
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }
  function removeRow(index) { setRows((prev) => prev.filter((_, i) => i !== index)); }

  async function handleSubmit(e) {
    e.preventDefault();
    const valid = rows.filter((r) => r.date && r.name.trim());
    if (valid.length === 0) { toast.error("Please fill at least one holiday row completely."); return; }

    const payload = valid.map((r) => ({
      name: r.name.trim(),
      date: r.date,
      holiday_type: r.holiday_type,
      description: null,
      year: new Date(r.date + "T00:00:00").getFullYear(),
    }));

    setLoading(true);
    try {
      const res = await bulkCreateHolidays(payload);
      const { created, skipped, skipped_dates } = res.data;
      if (skipped > 0) {
        toast.success(`${created} added. ${skipped} skipped (already exist): ${skipped_dates.join(", ")}`);
      } else {
        toast.success(`${created} holiday(s) added to the calendar!`);
      }
      setRows([emptyRow()]);
      loadYears();
      loadExisting(selectedYear);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save holidays.");
    } finally {
      setLoading(false);
    }
  }

  async function loadYears() {
    try {
      const r = await getHolidays();
      const years = [...new Set(r.data.map((h) => h.year))].sort((a, b) => a - b);
      setAvailableYears(years);
      if (years.length > 0 && !years.includes(selectedYear)) {
        setSelectedYear(years[years.length - 1]);
      }
    } catch {}
  }

  async function loadExisting(yr) {
    try {
      const r = await getHolidays(yr);
      setExistingHolidays(r.data);
    } catch {}
  }

  useEffect(() => { loadYears(); }, []);
  useEffect(() => { loadExisting(selectedYear); }, [selectedYear]);

  function startEdit(h) {
    setEditingId(h.id);
    setEditForm({ name: h.name, date: h.date, holiday_type: h.holiday_type, year: h.year });
  }

  function cancelEdit() { setEditingId(null); setEditForm({}); }

  async function saveEdit(id) {
    try {
      await updateHoliday(id, {
        ...editForm,
        year: new Date(editForm.date + "T00:00:00").getFullYear(),
      });
      toast.success("Holiday updated");
      setEditingId(null);
      loadYears();
      loadExisting(selectedYear);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this holiday?")) return;
    try {
      await deleteHoliday(id);
      toast.success("Deleted");
      loadYears();
      loadExisting(selectedYear);
    } catch {}
  }

  const grouped = {};
  existingHolidays.forEach((h) => {
    const m = new Date(h.date + "T00:00:00").getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-8">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}>
        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-4 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute top-4 right-20 w-16 h-16 rounded-full bg-white/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MdAutoAwesome className="text-yellow-300 text-lg" />
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Admin Panel</span>
            </div>
            <h1 className="text-2xl font-extrabold">Update Holiday Calendar</h1>
            <p className="text-white/70 text-sm mt-1">Add new holidays or edit existing ones for any year</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
            <MdCalendarMonth className="text-white text-3xl" />
          </div>
        </div>
      </div>

      {/* ── Add New Holidays ── */}
      <div className="rounded-2xl overflow-hidden shadow-md"
        style={{ background: "linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)", border: "1.5px solid #e0e7ff" }}>
        <div className="px-5 py-4 border-b border-indigo-100"
          style={{ background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <MdAdd className="text-white text-base" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Add New Holidays</h2>
              <p className="text-indigo-100 text-xs">Year is auto-detected from the date you pick</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-indigo-100 text-xs font-bold uppercase tracking-wider"
            style={{ background: "linear-gradient(90deg, #eef2ff, #f5f3ff)" }}>
            <div className="col-span-3 text-indigo-500">Date</div>
            <div className="col-span-2 text-indigo-500">Day</div>
            <div className="col-span-4 text-indigo-500">Holiday Name</div>
            <div className="col-span-2 text-indigo-500">Type</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-indigo-50">
            <AnimatePresence>
              {rows.map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="col-span-3">
                    <input type="date" value={row.date}
                      onChange={(e) => updateRow(i, "date", e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white" />
                  </div>
                  <div className="col-span-2">
                    <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-400 truncate min-h-[38px] font-medium">
                      {row.day || <span className="text-indigo-200">Auto</span>}
                    </div>
                  </div>
                  <div className="col-span-4">
                    <input type="text" value={row.name}
                      onChange={(e) => updateRow(i, "name", e.target.value)}
                      placeholder="e.g., Diwali"
                      className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white" />
                  </div>
                  <div className="col-span-2">
                    <select value={row.holiday_type}
                      onChange={(e) => updateRow(i, "holiday_type", e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white">
                      <option value="mandatory">Mandatory</option>
                      <option value="optional">Optional</option>
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)}
                        className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <MdDelete className="text-lg" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="px-5 py-3 border-t border-indigo-100 flex items-center justify-between bg-indigo-50/30">
            <button type="button" onClick={addRow}
              className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors">
              <MdAdd className="text-lg" /> Add More Row
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400 hidden sm:block">Missing rows will be skipped</p>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-semibold text-sm shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                <MdCheckCircle className="text-base" />
                {loading ? "Saving..." : "Save Holidays"}
              </motion.button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Existing Holidays List ── */}
      <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100">
        {/* Section header */}
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: "linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <MdCalendarMonth className="text-white text-base" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Existing Holidays</h2>
              <p className="text-white/50 text-xs">Use Edit / Delete buttons to modify</p>
            </div>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 focus:outline-none bg-white border-0 shadow-md"
          >
            {availableYears.map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>

        {existingHolidays.length === 0 ? (
          <div className="text-center py-16 bg-white">
            <span className="text-5xl">📅</span>
            <p className="mt-3 text-gray-500 font-semibold">No holidays found for {selectedYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr style={{ background: "linear-gradient(90deg, #eef2ff, #fdf4ff)" }}>
                  <th className="border border-indigo-100 px-4 py-2.5 text-left text-xs font-bold text-indigo-400 uppercase tracking-wider w-10">#</th>
                  <th className="border border-indigo-100 px-4 py-2.5 text-left text-xs font-bold text-indigo-400 uppercase tracking-wider">Date</th>
                  <th className="border border-indigo-100 px-4 py-2.5 text-left text-xs font-bold text-indigo-400 uppercase tracking-wider">Day</th>
                  <th className="border border-indigo-100 px-4 py-2.5 text-left text-xs font-bold text-indigo-400 uppercase tracking-wider">Holiday Name</th>
                  <th className="border border-indigo-100 px-4 py-2.5 text-left text-xs font-bold text-indigo-400 uppercase tracking-wider">Type</th>
                  <th className="border border-indigo-100 px-4 py-2.5 text-center text-xs font-bold text-indigo-400 uppercase tracking-wider w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(grouped).sort((a, b) => a - b).map((month) => (
                  <>
                    <tr key={`month-${month}`}>
                      <td colSpan={6} className="px-4 py-1.5 border border-indigo-100"
                        style={{ background: "linear-gradient(90deg, #e0e7ff, #ede9fe)" }}>
                        <span className="text-xs font-extrabold text-indigo-500 uppercase tracking-widest">
                          {MONTHS[month]}
                        </span>
                      </td>
                    </tr>
                    {grouped[month].map((h, idx) => {
                      const isEditing = editingId === h.id;
                      const dayName = getDayFromDate(h.date);
                      const rowNum = existingHolidays.indexOf(h) + 1;
                      return (
                        <tr key={h.id}
                          className="transition-colors"
                          style={{ background: isEditing ? "#fefce8" : idx % 2 === 0 ? "#ffffff" : "#f8faff" }}>
                          <td className="border border-indigo-50 px-4 py-2.5 text-center text-xs font-bold text-indigo-300">{rowNum}</td>

                          <td className="border border-indigo-50 px-3 py-2.5">
                            {isEditing ? (
                              <input type="date" value={editForm.date}
                                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                                className="w-full px-2 py-1 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white" />
                            ) : (
                              <span className="text-gray-700 font-semibold">{h.date}</span>
                            )}
                          </td>

                          <td className="border border-indigo-50 px-3 py-2.5">
                            <span className="text-indigo-500 font-medium text-sm">
                              {isEditing ? getDayFromDate(editForm.date) || "—" : dayName}
                            </span>
                          </td>

                          <td className="border border-indigo-50 px-3 py-2.5">
                            {isEditing ? (
                              <input type="text" value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full px-2 py-1 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white" />
                            ) : (
                              <span className="font-bold text-gray-800">{h.name}</span>
                            )}
                          </td>

                          <td className="border border-indigo-50 px-3 py-2.5">
                            {isEditing ? (
                              <select value={editForm.holiday_type}
                                onChange={(e) => setEditForm((f) => ({ ...f, holiday_type: e.target.value }))}
                                className="w-full px-2 py-1 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white">
                                <option value="mandatory">Mandatory</option>
                                <option value="optional">Optional</option>
                              </select>
                            ) : (
                              <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${
                                h.holiday_type === "mandatory"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-pink-100 text-pink-600"
                              }`}>
                                {h.holiday_type === "mandatory" ? "🎯 Mandatory" : "⭐ Optional"}
                              </span>
                            )}
                          </td>

                          <td className="border border-indigo-50 px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveEdit(h.id)} title="Save"
                                    className="flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors"
                                    style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                                    <MdSave className="text-sm" /> Save
                                  </button>
                                  <button onClick={cancelEdit} title="Cancel"
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                                    <MdClose className="text-sm" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(h)} title="Edit"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-indigo-700"
                                    style={{ background: "linear-gradient(135deg,#e0e7ff,#ede9fe)" }}>
                                    <MdEdit className="text-sm" /> Edit
                                  </button>
                                  <button onClick={() => handleDelete(h.id)} title="Delete"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-red-600"
                                    style={{ background: "linear-gradient(135deg,#fee2e2,#fecaca)" }}>
                                    <MdDelete className="text-sm" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
