import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdDashboard, MdEventNote, MdAddCircleOutline, MdPendingActions,
  MdCalendarMonth, MdHolidayVillage, MdPeople, MdAccountBalance, MdPerson,
  MdEditCalendar, MdShield, MdHomeWork
} from "react-icons/md";

const navItems = [
  { to: "/dashboard",       icon: MdDashboard,        label: "Dashboard",        roles: ["all"],                                                        color: "from-blue-500 to-cyan-400",     end: true },
  { to: "/leaves",          icon: MdEventNote,        label: "My Leaves",        roles: ["manager","hr"],                                               color: "from-indigo-500 to-blue-400",   end: true },
  { to: "/leaves/apply",    icon: MdAddCircleOutline,  label: "Apply Leave",     roles: ["employee","team_lead","manager","hr"],                         color: "from-green-500 to-emerald-400", end: true },
  { to: "/wfh",             icon: MdHomeWork,          label: "Work From Home",  roles: ["employee","team_lead","manager","hr"],                         color: "from-sky-500 to-cyan-400",      end: true },
  { to: "/approvals",       icon: MdPendingActions,    label: "Approvals",       roles: ["employee","team_lead","manager","main_manager","admin","hr"],  color: "from-orange-500 to-amber-400",  end: true },
  { to: "/calendar",        icon: MdCalendarMonth,     label: "Calendar",        roles: ["all"],                                                        color: "from-pink-500 to-rose-400",     end: true },
  { to: "/holidays",        icon: MdHolidayVillage,    label: "Holidays",        roles: ["all"],                                                        color: "from-indigo-500 to-blue-400",   end: true },
  { to: "/holidays/update", icon: MdEditCalendar,      label: "Update Holidays", roles: ["admin","main_manager","hr"],                                  color: "from-violet-500 to-purple-400", end: true },
  { to: "/employees",       icon: MdPeople,            label: "Employees",       roles: ["admin","main_manager","manager","hr"],                         color: "from-teal-500 to-cyan-400",     end: true },
  { to: "/departments",     icon: MdAccountBalance,    label: "Departments",     roles: ["admin","main_manager"],                                        color: "from-red-500 to-pink-400",      end: true },
  { to: "/admin-wfh",       icon: MdHomeWork,          label: "WFH Report",      roles: ["admin","main_manager","hr","manager","team_lead"],            color: "from-sky-500 to-cyan-400",      end: true },
  { to: "/allowed-emails",  icon: MdShield,            label: "Email Whitelist", roles: ["admin", "hr"],                                                color: "from-emerald-500 to-green-400", end: true },
  { to: "/profile",         icon: MdPerson,            label: "Profile",         roles: ["all"],                                                        color: "from-slate-500 to-gray-400",    end: true },
];

export default function Sidebar() {
  const { sidebarOpen } = useSelector((s) => s.ui);
  const { user } = useSelector((s) => s.auth);
  const role = user?.role || "employee";

  const visible = navItems.filter(
    (item) => item.roles.includes("all") || item.roles.includes(role)
  );

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 210 : 68 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-full z-30 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-20 left-4 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-32 right-2 w-20 h-20 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
            <MdEventNote className="text-white text-lg" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                <p className="font-bold text-white text-sm leading-tight">Mepstra</p>
                <p className="text-blue-400 text-xs font-light">Leave Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-3 px-2 space-y-0.5 overflow-y-auto pb-4" style={{ maxHeight: "calc(100vh - 64px)" }}>
        {visible.map(({ to, icon: Icon, label, color, end }) => (
          <NavLink key={to} to={to} end={end}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group relative ${
                  isActive ? "bg-white/15 shadow-lg" : "hover:bg-white/8"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className={`absolute inset-0 bg-gradient-to-r ${color} opacity-20 rounded-xl`}
                    style={{ zIndex: 0 }}
                  />
                )}
                <div className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive
                    ? `bg-gradient-to-br ${color} shadow-md`
                    : "bg-white/10 group-hover:bg-white/15"
                }`}>
                  <Icon className="text-white text-base" />
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className={`relative z-10 text-sm font-medium whitespace-nowrap ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && (
                  <motion.div className="absolute right-2 z-10 w-1.5 h-1.5 rounded-full bg-white" layoutId="dot" />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

    </motion.aside>
  );
}
