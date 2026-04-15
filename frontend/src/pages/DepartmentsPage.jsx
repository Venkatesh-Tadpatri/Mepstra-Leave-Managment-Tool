import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getUsers } from "../services/api";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { MdAdd, MdEdit, MdDelete, MdClose, MdPeople, MdBusinessCenter } from "react-icons/md";

const BUSINESS_UNITS = [
  { value: "mepstra_power_solutions", label: "Mepstra Power Solutions" },
  { value: "mepstra_engineering_consultancy", label: "Mepstra Engineering and Consultancy" },
];

const DEPT_GRADIENTS = [
  { from: "#3b82f6", to: "#6366f1", bg: "from-blue-500 to-indigo-600" },
  { from: "#10b981", to: "#059669", bg: "from-emerald-500 to-green-600" },
  { from: "#f59e0b", to: "#ea580c", bg: "from-amber-500 to-orange-600" },
  { from: "#8b5cf6", to: "#7c3aed", bg: "from-violet-500 to-purple-700" },
  { from: "#ec4899", to: "#db2777", bg: "from-pink-500 to-pink-700" },
  { from: "#06b6d4", to: "#0891b2", bg: "from-cyan-500 to-cyan-700" },
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", business_unit: "mepstra_power_solutions", description: "" });
  const [loading, setLoading] = useState(false);

  async function load() {
    const [dRes, uRes] = await Promise.all([getDepartments(), getUsers()]);
    setDepartments(dRes.data);
    setUsers(uRes.data);
  }

  useEffect(() => { load(); }, []);

  function deptCount(id) {
    return users.filter((u) => u.department_id === id).length;
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", business_unit: "mepstra_power_solutions", description: "" });
    setShowForm(true);
  }

  function openEdit(d) {
    setEditing(d);
    setForm({ name: d.name, business_unit: d.business_unit, description: d.description || "" });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, form);
        toast.success("Department updated");
      } else {
        await createDepartment(form);
        toast.success("Department created");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", business_unit: "mepstra_power_solutions", description: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this department?")) return;
    try {
      await deleteDepartment(id);
      toast.success("Department deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Departments</h1>
          <p className="text-gray-400 text-sm mt-0.5">{departments.length} departments · {users.length} total employees</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow text-sm">
          <MdAdd className="text-lg" /> Add Department
        </motion.button>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d, i) => {
          const grad = DEPT_GRADIENTS[i % DEPT_GRADIENTS.length];
          const count = deptCount(d.id);
          return (
            <motion.div key={d.id} variants={fadeUp} whileHover={{ y: -4 }}
              onClick={() => navigate(`/employees?department=${d.id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer">

              {/* Color bar */}
              <div className={`h-1.5 bg-gradient-to-r ${grad.bg}`} />

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 bg-gradient-to-br ${grad.bg} rounded-xl flex items-center justify-center shadow-sm`}>
                      <MdBusinessCenter className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{d.name}</h3>
                      <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                        {d.business_unit === "mepstra_power_solutions"
                          ? "Mepstra Power Solutions"
                          : "Mepstra Engineering and Consultancy"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[140px] truncate">
                        {d.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(d);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <MdEdit className="text-sm" />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(d.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <MdDelete className="text-sm" />
                    </motion.button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MdPeople className="text-gray-400" />
                    <span className="text-sm text-gray-600 font-medium">{count} employee{count !== 1 ? "s" : ""}</span>
                  </div>
                  {count > 0 && (
                    <div className="flex -space-x-1.5">
                      {users.filter((u) => u.department_id === d.id).slice(0, 3).map((u, j) => (
                        <div key={u.id}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${DEPT_GRADIENTS[j % DEPT_GRADIENTS.length].bg} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                          {u.full_name[0].toUpperCase()}
                        </div>
                      ))}
                      {count > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold">
                          +{count - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {departments.length === 0 && (
          <motion.div variants={fadeUp} className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-20">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MdBusinessCenter className="text-gray-300 text-3xl" />
            </div>
            <p className="text-gray-600 font-semibold">No departments yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first department to get started</p>
            <motion.button whileHover={{ scale: 1.03 }} onClick={openCreate}
              className="mt-5 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25">
              Add Department
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{editing ? "Edit Department" : "Add Department"}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{editing ? "Update department details" : "Create a new department"}</p>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <MdClose />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required placeholder="e.g., Software" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Business Unit *</label>
                  <select
                    value={form.business_unit}
                    onChange={(e) => setForm({ ...form, business_unit: e.target.value })}
                    className="input-field"
                    required
                  >
                    {BUSINESS_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} placeholder="Brief description of this department..." className="input-field resize-none text-sm" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50">
                    {loading ? "Saving..." : editing ? "Update" : "Create"}
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
