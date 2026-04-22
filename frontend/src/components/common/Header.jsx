import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MdMenu, MdNotifications, MdLogout, MdPerson } from "react-icons/md";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { logout } from "../../store/slices/authSlice";
import { useState, useRef, useEffect } from "react";

const ROLE_COLORS = {
  admin: "from-red-500 to-pink-500",
  main_manager: "from-purple-500 to-violet-500",
  manager: "from-blue-500 to-cyan-500",
  hr: "from-orange-500 to-amber-500",
  team_lead: "from-teal-500 to-green-500",
  employee: "from-blue-500 to-indigo-500",
};

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { pending, pendingWFH } = useSelector((s) => s.leaves);
  const totalPending = (pending?.length || 0) + (pendingWFH?.length || 0);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!dropOpen) return;
    function handleClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropOpen]);

  const gradient = ROLE_COLORS[user?.role] || "from-blue-500 to-indigo-500";

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <MdMenu className="text-xl" />
        </motion.button>

        <div className="flex items-center px-2 py-1.5 rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50">
          <img src="/mepstra-logo.png" alt="Mepstra" className="h-11 w-auto object-contain" />
        </div>

        <div className="hidden md:block h-6 w-px bg-gray-200" />

        <div className="hidden md:block">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
            Welcome, {user?.full_name}
            <motion.span animate={{ rotate: [0, 20, -10, 20, 0] }} transition={{ delay: 0.5, duration: 0.8 }}>
              👋
            </motion.span>
          </p>
          <p className="text-xs text-gray-400 capitalize">{user?.role === "hr" ? "HR/Admin" : user?.role?.replace(/_/g, " ")} · {user?.department?.name || "Mepstra"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/approvals")}
          className={`relative p-2.5 rounded-xl transition-colors ${
            totalPending > 0
              ? "bg-orange-50 text-orange-500 hover:bg-orange-100"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          <MdNotifications className="text-xl" />
          {totalPending > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow"
            >
              {totalPending}
            </motion.span>
          )}
        </motion.button>

        <div className="relative" ref={dropRef}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setDropOpen(!dropOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
          >
            {user?.profile_image ? (
              <img
                src={`http://localhost:8000${user.profile_image}`}
                alt={user.full_name}
                className="w-8 h-8 rounded-lg object-cover shadow-md"
              />
            ) : (
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                {user?.full_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left max-w-[120px]">
              <p className="text-xs font-semibold text-gray-800 leading-tight truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400 capitalize leading-tight">{user?.role === "hr" ? "HR/Admin" : user?.role?.replace(/_/g, " ")}</p>
            </div>
          </motion.button>

          <AnimatePresence>
            {dropOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
              >
                <div className={`p-4 bg-gradient-to-br ${gradient}`}>
                  <div className="flex items-center gap-3">
                    {user?.profile_image ? (
                      <img
                        src={`http://localhost:8000${user.profile_image}`}
                        alt={user.full_name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                      {user?.full_name?.[0]?.toUpperCase()}
                    </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-semibold truncate">{user?.full_name}</p>
                      <p className="text-white/70 text-xs break-all leading-snug mt-0.5">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button onClick={() => { navigate("/profile"); setDropOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <MdPerson className="text-gray-400 text-lg" /> My Profile
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button onClick={() => { dispatch(logout()); navigate("/login"); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <MdLogout className="text-red-400 text-lg" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
