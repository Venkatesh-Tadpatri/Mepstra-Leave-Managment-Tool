import { useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { loginUser, clearError } from "../store/slices/authSlice";
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdArrowForward, MdShield } from "react-icons/md";

const FEATURES = [
  { icon: "🚀", text: "Instant leave applications",    color: "from-teal-500 to-teal-600"    },
  { icon: "✅", text: "Multi-level manager approvals", color: "from-emerald-500 to-green-600" },
  { icon: "📊", text: "Live balance tracking",         color: "from-cyan-500 to-cyan-600"    },
  { icon: "🔔", text: "Real-time email alerts",        color: "from-sky-500 to-blue-600"     },
];

const FOCUS_RING_SHADOW = "0 0 0 2px rgba(20,184,166,0.3), 0 0 16px rgba(20,184,166,0.08)";

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

      {/* ── Left Panel ── */}
      <div
        className="hidden lg:flex lg:w-[42%] h-full relative flex-col justify-between p-4 xl:p-5 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b2a 0%, #0f3460 35%, #16213e 65%, #0a1628 100%)" }}
      >
        {/* Animated blobs */}
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-8 w-64 h-64 bg-teal-500/25 rounded-full blur-3xl pointer-events-none" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-32 left-4 w-56 h-56 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        {/* Rotating rings */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full border border-teal-500/20 pointer-events-none" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full border border-cyan-400/15 pointer-events-none" />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-40px] left-[-40px] w-56 h-56 rounded-full border border-emerald-500/15 pointer-events-none" />
        {/* Floating particles */}
        {[
          { top: "20%", left: "15%", delay: 0 },
          { top: "40%", left: "80%", delay: 1.2 },
          { top: "65%", left: "20%", delay: 2.1 },
          { top: "80%", left: "70%", delay: 0.7 },
          { top: "12%", left: "65%", delay: 1.8 },
        ].map((d, i) => (
          <motion.div key={i}
            animate={{ y: [-8, 8, -8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: d.delay }}
            className="absolute w-1.5 h-1.5 bg-teal-400/60 rounded-full pointer-events-none"
            style={{ top: d.top, left: d.left }} />
        ))}
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #5eead4 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10">
          <div className="inline-flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 shadow-lg shadow-black/30">
            <img src="/mepstra-logo.png" alt="Mepstra" className="h-9 w-auto object-contain" />
            <div className="border-l border-gray-200 pl-3">
              <p className="text-sm font-extrabold text-slate-800 leading-none">Mepstra</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Leave Management</p>
            </div>
          </div>
        </motion.div>

        {/* Headline + features */}
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
          className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white leading-[1.2] mb-2">
            Your Smart{" "}
            <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">Leave</span>{" "}
            Management Portal
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-3 max-w-xl">
            Streamline approvals, track balances, and manage time off — all in one place.
          </p>
          <div className="space-y-1.5">
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.1, duration: 0.5 }}
                whileHover={{ x: 6, transition: { duration: 0.2 } }}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm cursor-default">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-sm shadow-md flex-shrink-0`}>
                  {f.icon}
                </div>
                <span className="text-slate-200 text-sm font-medium leading-snug">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom tagline */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
          className="relative z-10">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-1">Trusted by Mepstra Teams</p>
          <p className="text-slate-500 text-xs leading-relaxed">Secure · Fast · Reliable leave management</p>
        </motion.div>
      </div>

      {/* ── Right Form Panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16 py-6 relative h-full overflow-hidden"
        style={{ background: "#f1f5f9" }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.45] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        {/* Back-lighting glow behind card — teal top-right */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute pointer-events-none"
          style={{
            width: 420, height: 420,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%) translate(60px, -80px)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,184,166,0.22) 0%, rgba(6,182,212,0.10) 50%, transparent 72%)",
            filter: "blur(48px)",
          }}
        />
        {/* Back-lighting glow — violet bottom-left */}
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute pointer-events-none"
          style={{
            width: 380, height: 380,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%) translate(-80px, 90px)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.16) 0%, rgba(99,102,241,0.08) 50%, transparent 72%)",
            filter: "blur(56px)",
          }}
        />
        {/* Faint center warm glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute pointer-events-none"
          style={{
            width: 300, height: 300,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />

        {/* ── Welcome Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="absolute top-0 left-0 right-0 z-10 px-8 sm:px-12 lg:px-16 py-3"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #0f766e 100%)" }}
        >
          <div className="flex items-center gap-3 max-w-[380px] mx-auto">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-md flex-shrink-0">
              <img src="/mepstra-logo.png" alt="Mepstra" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-teal-100 uppercase tracking-widest leading-none">Welcome to</p>
              <p className="text-lg font-extrabold text-white leading-tight">Mepstra</p>
              <p className="text-[11px] text-teal-100 leading-none">Smart Leave Management Portal</p>
            </div>
          </div>
        </motion.div>

        {/* ── Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="relative z-10 w-full max-w-[380px] mx-auto mt-20"
        >
          {/* Animated glowing border */}
          <div
            className="p-[1.5px] rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #14b8a6, #06b6d4, #8b5cf6, #14b8a6)",
              backgroundSize: "300% 300%",
              animation: "gradientShift 5s ease infinite",
            }}
          >
            {/* Pure white card */}
            <div className="bg-white rounded-[14px] overflow-hidden shadow-2xl shadow-slate-200/80">

              {/* Card header — dark gradient */}
              <div
                className="relative px-7 pt-7 pb-5 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a3e 100%)" }}
              >
                {/* Header inner glows */}
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-teal-400/20 rounded-full blur-2xl pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.45, 0.2] }}
                  transition={{ duration: 7, repeat: Infinity, delay: 1 }}
                  className="absolute bottom-[-10px] left-[-10px] w-24 h-24 bg-violet-500/20 rounded-full blur-2xl pointer-events-none"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-3 right-10 w-16 h-16 rounded-full border border-teal-400/15 pointer-events-none"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                  className="absolute top-5 right-12 w-8 h-8 rounded-full border border-cyan-300/20 pointer-events-none"
                />

                {/* Lock icon */}
                <div className="flex justify-center mb-4 relative">
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.8, 1], opacity: [0.45, 0, 0.45] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="absolute inset-[-10px] rounded-full bg-teal-400/25 pointer-events-none"
                    />
                    <motion.div
                      animate={{ scale: [1, 2.2, 1], opacity: [0.25, 0, 0.25] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                      className="absolute inset-[-10px] rounded-full bg-cyan-400/15 pointer-events-none"
                    />
                    <motion.div
                      whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/50 relative z-10"
                    >
                      <MdLock className="text-white text-2xl" />
                    </motion.div>
                  </div>
                </div>

                <div className="text-center relative z-10">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Sign In</h2>
                  <p className="text-slate-400 text-xs mt-0.5 tracking-wide">Enter your credentials to access your workspace</p>
                </div>

                {/* Mobile logo */}
                <div className="flex lg:hidden justify-center mt-3 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15">
                    <img src="/mepstra-logo.png" alt="Mepstra" className="h-5 w-auto object-contain"
                      style={{ filter: "brightness(0) invert(1)" }} />
                    <span className="text-xs font-bold text-white/80">Mepstra</span>
                  </div>
                </div>
              </div>

              {/* Form body — pure white */}
              <div className="px-7 py-6 bg-white">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="mb-4 flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                      ⚠️ {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form
                  onSubmit={(e) => { e.preventDefault(); dispatch(loginUser({ email: form.email.trim(), password: form.password.trim() })); }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <motion.div
                        animate={focused === "email" ? { opacity: 1 } : { opacity: 0 }}
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ boxShadow: FOCUS_RING_SHADOW }}
                      />
                      <MdEmail className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base transition-all duration-200 ${focused === "email" ? "text-teal-500 scale-110" : "text-gray-400"}`} />
                      <input
                        type="email" name="email" value={form.email} onChange={handleChange} required
                        onFocus={() => setFocused("email")} onBlur={() => setFocused("")}
                        placeholder="you@mepstra.com"
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-teal-400 text-gray-700 placeholder-gray-300 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      4-Digit PIN
                    </label>
                    <div className="relative">
                      <motion.div
                        animate={focused === "password" ? { opacity: 1 } : { opacity: 0 }}
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ boxShadow: FOCUS_RING_SHADOW }}
                      />
                      <MdLock className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-base transition-all duration-200 ${focused === "password" ? "text-teal-500 scale-110" : "text-gray-400"}`} />
                      <input
                        type={showPwd ? "text" : "password"} name="password" value={form.password} onChange={handleChange} required
                        onFocus={() => setFocused("password")} onBlur={() => setFocused("")}
                        placeholder="••••" maxLength={4} inputMode="numeric"
                        className="w-full pl-10 pr-11 py-2.5 text-center text-xl tracking-[0.4em] border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-teal-400 text-gray-700 transition-all duration-200"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-500 p-1 transition-colors">
                        {showPwd ? <MdVisibilityOff className="text-base" /> : <MdVisibility className="text-base" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={{ scale: 1.025, boxShadow: "0 8px 36px rgba(20,184,166,0.45)" }}
                    whileTap={{ scale: 0.975 }}
                    className="relative w-full py-3 mt-1 text-white rounded-xl font-bold text-sm overflow-hidden disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #0f766e 0%, #0891b2 50%, #0d9488 100%)",
                      boxShadow: "0 4px 20px rgba(20,184,166,0.35)",
                    }}
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
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                  className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400"
                >
                  <MdShield className="text-teal-500 text-sm" />
                  <span>256-bit encrypted · Secure login</span>
                </motion.div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center mb-2">New to Mepstra?</p>
                  <Link to="/register"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-teal-500/40 text-teal-700 font-bold text-sm hover:bg-teal-50 hover:border-teal-500 transition-all duration-200">
                    <span>Create an Account</span>
                    <MdArrowForward className="text-base" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Glow beneath card */}
          <motion.div
            animate={{ opacity: [0.35, 0.6, 0.35] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-x-8 bottom-[-12px] h-6 rounded-full blur-lg pointer-events-none"
            style={{ background: "linear-gradient(90deg, #14b8a6, #06b6d4, #8b5cf6)" }}
          />
        </motion.div>
      </div>

    </div>
  );
}
