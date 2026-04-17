import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { loginUser, clearError } from "../store/slices/authSlice";
import {
  MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdArrowForward, MdShield,
  MdBeachAccess, MdHealthAndSafety, MdFamilyRestroom, MdCalendarMonth, MdCheckCircle,
  MdEventAvailable, MdAutoAwesome,
} from "react-icons/md";
import { FaLeaf } from "react-icons/fa";
import CookieConsent from "../components/common/CookieConsent";

const FEATURES = [
  { icon: <MdEventAvailable className="text-sm" />,  text: "Instant leave applications",    color: "from-teal-500 to-teal-600"    },
  { icon: <MdCheckCircle className="text-sm" />,     text: "Multi-level manager approvals", color: "from-emerald-500 to-green-600" },
  { icon: <MdCalendarMonth className="text-sm" />,   text: "Live balance tracking",         color: "from-cyan-500 to-sky-600"     },
  { icon: <MdAutoAwesome className="text-sm" />,     text: "Real-time email alerts",        color: "from-violet-500 to-purple-600" },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) dispatch(clearError());
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row">

      {/* ══ LEFT PANEL ══ */}
      <div
        className="hidden lg:flex lg:w-[40%] h-full relative flex-col justify-between p-5 xl:p-6 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1478cc 0%, #1a9ae8 40%, #20b5f5 70%, #2dd4fa 100%)",
          zIndex: 5,
        }}
      >
        {/* background blobs */}
        <motion.div animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-12 right-4 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-24 left-0 w-64 h-64 bg-white/15 rounded-full blur-3xl pointer-events-none" />
        {/* grid dots */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.25) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* ── top: logo + headline ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }} className="relative z-10">

          {/* Logo */}
          <motion.div whileHover={{ scale: 1.03 }} className="mb-4 inline-block">
            <div className="bg-white rounded-2xl px-4 py-2.5 shadow-lg shadow-black/10 inline-flex items-center">
              <img src="/mepstra-logo.png" alt="Mepstra" className="h-12 w-auto object-contain" />
            </div>
          </motion.div>

          <h2 className="text-2xl xl:text-3xl font-extrabold text-white leading-[1.15] mb-2">
            Your Smart{" "}
            <span className="relative inline-block">
              <span className="text-yellow-300 font-black drop-shadow-sm">Leave</span>
              <motion.div
                animate={{ scaleX: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 to-yellow-200 rounded-full"
              />
            </span>{" "}
            Management Portal
          </h2>
          <p className="text-white/75 text-sm leading-relaxed mb-4 max-w-xs">
            Streamline approvals, track balances, and manage time off — all in one place.
          </p>

          {/* feature pills */}
          <div className="space-y-2">
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ x: 6, transition: { duration: 0.2 } }}
                className="flex items-center gap-3 p-2.5 rounded-xl cursor-default"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  backdropFilter: "blur(8px)",
                }}>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                  {f.icon}
                </div>
                <span className="text-white text-sm font-semibold drop-shadow-sm">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── bottom tagline ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }} className="relative z-10">
          <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em] mb-1">Trusted by Mepstra Teams</p>
          <p className="text-white/60 text-xs leading-relaxed">Secure · Fast · Reliable leave management</p>
        </motion.div>
      </div>

      {/* ══ RIGHT FORM PANEL ══ */}
      <div className="flex-1 flex items-start justify-center p-3 sm:p-4 lg:p-6 relative h-full overflow-y-auto"
        style={{
          background: "linear-gradient(160deg, #f0fdf9 0%, #e8f8f5 30%, #f0f9ff 70%, #fafffe 100%)",
          zIndex: 3,
        }}>

        {/* background dots */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(26,154,232,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.7 }} />

        {/* glow orbs */}
        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(26,154,232,0.3) 0%, transparent 70%)" }} />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-60px] left-[-60px] w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(45,212,250,0.2) 0%, transparent 70%)" }} />

        {/* ── TOP HEADER BANNER ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-0 left-0 right-0 z-20 pl-3 sm:pl-4 lg:pl-6 pr-4 py-2.5"
          style={{ background: "linear-gradient(135deg, #1478cc 0%, #1a9ae8 50%, #20b5f5 100%)", boxShadow: "0 4px 24px rgba(26,154,232,0.35)" }}
        >
          <div className="flex items-center justify-between">
            {/* left: brand text */}
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-lg font-black text-white leading-none">Mepstra</p>
                  <MdShield className="text-white/70 text-sm" />
                </div>
                <p className="text-[10px] text-white/80 font-semibold tracking-wider uppercase leading-none mt-0.5">Smart Leave Management Portal</p>
              </div>
            </div>

            {/* right: leave type mini icons */}
            <div className="hidden sm:flex items-center gap-1.5">
              {[
                { icon: <MdBeachAccess className="text-xs" />,     tip: "Annual",    col: "bg-cyan-500"    },
                { icon: <MdHealthAndSafety className="text-xs" />, tip: "Sick",      col: "bg-rose-500"    },
                { icon: <FaLeaf className="text-[10px]" />,        tip: "Casual",    col: "bg-emerald-500" },
                { icon: <MdFamilyRestroom className="text-xs" />,  tip: "Maternity", col: "bg-purple-500"  },
                { icon: <MdCalendarMonth className="text-xs" />,   tip: "Privilege", col: "bg-amber-500"   },
              ].map((ic, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  title={ic.tip}
                  className={`w-6 h-6 rounded-lg ${ic.col} flex items-center justify-center text-white shadow-sm cursor-default`}>
                  {ic.icon}
                </motion.div>
              ))}
              <span className="text-white/80 text-[10px] font-semibold ml-1">+more</span>
            </div>
          </div>
        </motion.div>

        {/* ── FORM CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="w-full flex flex-col py-4 px-6 sm:px-10 lg:px-14 xl:px-16 relative z-10 mt-16 rounded-2xl"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(26,154,232,0.12)",
            boxShadow: "0 8px 40px rgba(26,154,232,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
          }}
        >
          {/* top shimmer line */}
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

          {/* card header */}
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/30 flex-shrink-0">
                <MdLock className="text-base" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-600/80">Welcome Back — Login</p>
                <h2 className="text-lg font-extrabold leading-tight text-gray-900">Sign In</h2>
              </div>
            </div>
            <p className="text-gray-400 text-xs ml-10 leading-tight mt-0.5">
              Enter your credentials to access your workspace
            </p>
          </div>

          {/* form */}
          <form
            onSubmit={(e) => { e.preventDefault(); dispatch(loginUser({ email: form.email.trim(), password: form.password.trim() })); }}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <MdEmail className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base transition-all duration-200 ${focused === "email" ? "text-blue-500 scale-110" : "text-gray-400"}`} />
                <input
                  type="email" name="email" value={form.email} onChange={handleChange} required
                  onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                  placeholder="you@mepstra.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-700 placeholder-gray-300 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">4-Digit PIN</label>
              <div className="relative">
                <MdLock className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base transition-all duration-200 ${focused === "password" ? "text-blue-500 scale-110" : "text-gray-400"}`} />
                <input
                  type={showPwd ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required
                  onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                  placeholder="••••" maxLength={4} inputMode="numeric"
                  className="w-full pl-10 pr-11 py-2.5 text-center text-xl tracking-[0.4em] border border-gray-200 rounded-lg bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-700 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 p-1 transition-colors">
                  {showPwd ? <MdVisibilityOff className="text-base" /> : <MdVisibility className="text-base" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium"
                >
                  <span className="text-base flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1478cc 0%, #1a9ae8 60%, #20b5f5 100%)", boxShadow: "0 4px 20px rgba(26,154,232,0.4)" }}
            >
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)", width: "60%" }}
              />
              {loading ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Signing in...
                </>
              ) : <><span>Sign In</span><MdArrowForward className="text-base" /></>}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-400"
          >
            <MdShield className="text-blue-500 text-sm" />
            <span>256-bit encrypted · Secure login</span>
          </motion.div>

          <div className="border-t border-gray-100 mt-3 pt-3">
            <p className="text-xs text-gray-400 text-center mb-2">New to Mepstra?</p>
            <Link to="/register"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-blue-400/50 text-blue-700 font-bold text-sm hover:bg-blue-50 hover:border-blue-500 transition-all duration-200">
              <span>Create an Account</span>
              <MdArrowForward className="text-base" />
            </Link>
          </div>
        </motion.div>
      </div>

      <CookieConsent />
    </div>
  );
}
