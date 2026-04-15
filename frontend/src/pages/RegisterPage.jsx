import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { register, getDepartments, getManagers, getAdminUser } from "../services/api";
import api from "../services/api";
import {
  MdPerson, MdEmail, MdLock, MdPhone, MdWork, MdBusiness,
  MdArrowForward, MdCheckCircle, MdSend, MdRefresh,
} from "react-icons/md";

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

const ROLES = [
  { value: "employee",  label: "Employee",  icon: "👤" },
  { value: "team_lead", label: "Team Lead", icon: "👥" },
  { value: "manager",   label: "Manager",   icon: "🏆" },
  { value: "hr",        label: "HR",        icon: "🎯" },
];

const BUSINESS_UNITS = [
  { value: "mepstra_power_solutions",         label: "Mepstra Power Solutions",                    icon: "⚡" },
  { value: "mepstra_engineering_consultancy", label: "Mepstra Engineering and Consultancy Pvt. Ltd.", icon: "🔧" },
];

const STEPS = ["Employment", "Account", "Verify OTP", "Personal", "Confirm"];
const MANAGER_ROLES = ["manager", "team_lead", "hr"];
const COOKIE_CONSENT_KEY = "mepstra_cookie_consent";

const GENDERS = [
  { value: "male",   label: "Male",   symbol: "♂", color: "from-blue-500 to-blue-600",   ring: "ring-blue-400",   bg: "bg-blue-50",   text: "text-blue-700"   },
  { value: "female", label: "Female", symbol: "♀", color: "from-pink-500 to-rose-500",   ring: "ring-pink-400",   bg: "bg-pink-50",   text: "text-pink-700"   },
];

const MARITAL_STATUSES = [
  { value: "single",  label: "Single",  icon: "💼" },
  { value: "married", label: "Married", icon: "💍" },
];

function SignInCTA() {
  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-400 text-center mb-2">Already have an account?</p>
      <Link to="/login"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-teal-500/40 text-teal-700 font-bold text-sm hover:bg-teal-50 hover:border-teal-500 transition-all duration-200">
        <span>Sign In</span>
        <MdArrowForward className="text-base" />
      </Link>
    </div>
  );
}

function InputField({ label, icon: Icon, error, ...props }) {
  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
        <input
          {...props}
          className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-white/80 backdrop-blur-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all ${
            error ? "border-red-400" : "border-gray-200"
          }`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    employment_type: "", business_unit: "",
    full_name: "", email: "", pin: "", confirm_pin: "",
    phone: "", role: "employee",
    otp_code: "",
    department_id: "", manager_id: "",
    gender: "", joining_date: "", date_of_birth: "",
    marital_status: "", marriage_date: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    Promise.all([getDepartments(), getManagers(), getAdminUser()])
      .then(([depts, mgrs, admin]) => {
        setDepartments(depts.data);
        setManagers(mgrs.data);
        setAdminUser(admin.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const savedConsent = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (savedConsent) setCookieConsent(savedConsent);
  }, []);

  const isManagerRole = MANAGER_ROLES.includes(form.role);

  useEffect(() => {
    if (isManagerRole && adminUser) {
      setForm((f) => ({ ...f, manager_id: String(adminUser.id) }));
    } else if (!isManagerRole) {
      setForm((f) => ({ ...f, manager_id: "" }));
    }
  }, [form.role, adminUser]);

  const filteredDepartments = departments.filter(
    (department) => department.business_unit === form.business_unit
  );

  const filteredManagers = form.department_id
    ? managers.filter((m) => m.department && String(m.department.id) === String(form.department_id))
    : managers;

  useEffect(() => {
    if (!form.department_id) return;
    const isValidDepartment = departments.some(
      (d) => d.business_unit === form.business_unit && String(d.id) === String(form.department_id)
    );
    if (!isValidDepartment) {
      setForm((f) => ({ ...f, department_id: "", manager_id: "" }));
      return;
    }
    if (form.manager_id) {
      const isValidManager = managers.find(
        (m) => String(m.id) === String(form.manager_id) && m.department && String(m.department.id) === String(form.department_id)
      );
      if (!isValidManager) setForm((f) => ({ ...f, manager_id: "" }));
    }
  }, [form.department_id, form.business_unit, departments, managers]);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const id = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [otpTimer]);

  function handleChange(e) {
    let { name, value } = e.target;
    if (name === "phone") value = value.replace(/\D/g, "").slice(0, 10);
    if (name === "email") value = value.trim().toLowerCase();
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  }

  function validateStep1() {
    const e = {};
    if (!form.employment_type) e.employment_type = "Please select employment type";
    if (!form.business_unit)   e.business_unit   = "Please select business unit";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext1(ev) {
    ev.preventDefault();
    if (validateStep1()) setStep(2);
  }

  function validateStep2() {
    const e = {};
    if (!form.full_name) e.full_name = "Required";
    if (!form.email) e.email = "Required";
    else {
      const email = form.email.trim().toLowerCase();
      const isCompanyEmail = /^[^@]+@(mepstra|mepsrta)\.com$/.test(email);
      const isAllowedGmail = /^[^@]+@gmail\.com$/.test(email)
        && (email.split("@")[0].includes("mepstra") || email.split("@")[0].includes("mepsrta"));
      if (!isCompanyEmail && !isAllowedGmail)
        e.email = "Use a @mepstra.com/@mepsrta.com email, or Gmail containing 'mepstra'/'mepsrta'";
    }
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Phone must be exactly 10 digits";
    if (!form.pin || !/^\d{4}$/.test(form.pin)) e.pin = "PIN must be exactly 4 digits";
    if (form.pin !== form.confirm_pin) e.confirm_pin = "PINs don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext2(ev) {
    ev.preventDefault();
    if (!validateStep2()) return;
    await handleSendOtp();
  }

  async function handleSendOtp() {
    setOtpLoading(true);
    try {
      await api.post("/auth/send-otp", { email: form.email.trim().toLowerCase() });
      setOtpSent(true);
      setOtpVerified(false);
      setOtpTimer(150);
      setStep(3);
      toast.success("OTP sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp(ev) {
    ev.preventDefault();
    if (!form.otp_code || form.otp_code.length !== 6) {
      setErrors((e) => ({ ...e, otp_code: "Enter the 6-digit OTP" }));
      return;
    }
    setOtpLoading(true);
    try {
      await api.post("/auth/verify-otp", { email: form.email.trim().toLowerCase(), otp: form.otp_code });
      setOtpVerified(true);
      setErrors((e) => ({ ...e, otp_code: "" }));
      toast.success("Email verified!");
      setStep(4);
    } catch (err) {
      setErrors((e) => ({ ...e, otp_code: err.response?.data?.detail || "Invalid OTP" }));
    } finally {
      setOtpLoading(false);
    }
  }

  function handleNext4(ev) {
    ev.preventDefault();
    setStep(5);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setLoading(true);
    try {
      const payload = {
        email:           form.email.trim().toLowerCase(),
        full_name:       form.full_name,
        password:        form.pin,
        phone:           form.phone || undefined,
        role:            form.role,
        employment_type: form.employment_type || undefined,
        business_unit:   form.business_unit   || undefined,
        department_id:   form.department_id   ? parseInt(form.department_id) : undefined,
        manager_id:      form.manager_id      ? parseInt(form.manager_id)      : undefined,
        otp_code:        form.otp_code,
        joining_date:    form.joining_date    || undefined,
        date_of_birth:   form.date_of_birth   || undefined,
        gender:          form.gender          || undefined,
        marital_status:  form.marital_status  || undefined,
        marriage_date:   form.marital_status === "married" ? (form.marriage_date || undefined) : undefined,
      };
      await register(payload);
      toast.success("Account created! Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const showCookieBanner = !cookieConsent;

  function handleCookieConsent(choice) {
    setCookieConsent(choice);
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row">

      {/* ── Left Panel ── widened from 36% → 42% ─────────────── */}
      <div
        className="hidden lg:flex lg:w-[39%] h-full relative flex-col justify-between p-4 xl:p-5 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b2a 0%, #0f3460 35%, #16213e 65%, #0a1628 100%)" }}
      >
        {/* Animated background blobs */}
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.45, 0.2] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-16 right-8 w-64 h-64 bg-teal-500/25 rounded-full blur-3xl pointer-events-none" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.35, 0.15] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-32 left-4 w-56 h-56 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full border border-teal-500/20 pointer-events-none" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20px] right-[-20px] w-36 h-36 rounded-full border border-cyan-400/15 pointer-events-none" />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-40px] left-[-40px] w-56 h-56 rounded-full border border-emerald-500/15 pointer-events-none" />

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

        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #5eead4 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        {/* Logo — sleek horizontal pill */}
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

        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
          className="relative z-10">
          <h2 className="text-2xl font-extrabold text-white leading-[1.2] mb-2">
            Join the{" "}
            <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">Smart Leave</span>{" "}
            Management
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-3 max-w-xl">
            Create your account and start managing leaves effortlessly with real-time approvals and tracking.
          </p>
          <div className="space-y-1.5">
            {[
              { icon: "🚀", text: "Instant leave applications",    color: "from-teal-500 to-teal-600"    },
              { icon: "✅", text: "Multi-level manager approvals", color: "from-emerald-500 to-green-600" },
              { icon: "📊", text: "Live balance tracking",         color: "from-cyan-500 to-cyan-600"    },
              { icon: "🔔", text: "Real-time email alerts",        color: "from-sky-500 to-blue-600"     },
            ].map((f, i) => (
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

        {/* Step progress */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
          className="relative z-10">
          <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-2">Registration Progress</p>
          <div className="flex items-center gap-1 flex-wrap">
            {STEPS.map((label, i) => {
              const s = i + 1;
              return (
                <div key={s} className="flex items-center gap-1">
                  <motion.div
                    animate={step === s ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step > s ? "bg-teal-500 text-white shadow-md shadow-teal-500/30"
                      : step === s ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-500/40 ring-2 ring-teal-300/40"
                      : "bg-white/10 text-slate-500 border border-white/15"
                    }`}>
                    {step > s ? <MdCheckCircle className="text-xs" /> : s}
                  </motion.div>
                  <span className={`text-xs font-semibold ${step >= s ? "text-teal-300" : "text-slate-600"}`}>{label}</span>
                  {s < STEPS.length && <div className={`w-2 h-0.5 rounded-full transition-all ${step > s ? "bg-teal-500" : "bg-white/15"}`} />}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Right Form Panel ─── */}
      <div className="flex-1 flex items-start justify-center p-3 sm:p-4 lg:p-6 relative h-full overflow-y-auto">

        <div className="register-grid absolute inset-0 pointer-events-none opacity-50" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/65 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/45 to-transparent pointer-events-none" />

        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.25, 0.5, 0.25] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-60px] right-[-60px] w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(20,184,166,0.35) 0%, transparent 70%)" }} />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.18, 0.38, 0.18] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[-80px] left-[-40px] w-80 h-80 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)" }} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.07 }}>
          <defs>
            <linearGradient id="bolt1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
              <stop offset="50%" stopColor="#14b8a6" stopOpacity="1" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bolt2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points="80,0 55,120 90,120 60,280" stroke="url(#bolt1)" strokeWidth="2" fill="none" />
          <polyline points="85%,10 78%,140 83%,140 75%,300" stroke="url(#bolt2)" strokeWidth="2" fill="none" />
          <polyline points="50%,0 45%,90 50%,90 42%,200" stroke="url(#bolt1)" strokeWidth="1.5" fill="none" />
        </svg>

        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(20,184,166,0.18) 1px, transparent 1px)", backgroundSize: "36px 36px", opacity: 0.5 }} />

        {/* ── Mepstra branding banner (all steps) ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="absolute top-0 left-0 right-0 z-20 px-5 py-3"
          style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #0f766e 100%)" }}
        >
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
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
          initial="hidden"
          animate="show"
          variants={stagger}
          className="register-card w-full flex flex-col py-4 px-6 sm:px-10 lg:px-16 xl:px-20 relative z-10 backdrop-blur-xl rounded-2xl mt-20"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/80 to-transparent" />
          <div className="pointer-events-none absolute right-8 top-8 h-28 w-28 rounded-full bg-gradient-to-br from-teal-200/30 to-cyan-200/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-8 left-6 h-24 w-24 rounded-full bg-gradient-to-br from-violet-200/20 to-amber-200/20 blur-2xl" />

          {/* Step bar (mobile only) */}
          <motion.div variants={fadeUp} className="flex gap-1 mb-2 lg:hidden">
            {STEPS.map((_, i) => (
              <motion.div key={i}
                animate={step === i + 1 ? { scaleY: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
                className={`h-1 flex-1 rounded-full transition-all ${step > i + 1 ? "bg-teal-500" : step === i + 1 ? "bg-gradient-to-r from-teal-500 to-cyan-500" : "bg-gray-200"}`} />
            ))}
          </motion.div>

          {/* Step header */}
          <motion.div variants={fadeUp} className="mb-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                {step}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-600/80">Step {step} of {STEPS.length} — Register</p>
                <h2 className="text-lg font-extrabold leading-tight text-gray-900">
                  {step === 1 && "Create Your Account"}
                  {step === 2 && "Account Information"}
                  {step === 3 && "Verify Your Email"}
                  {step === 4 && "Personal Details"}
                  {step === 5 && "Review & Submit"}
                </h2>
              </div>
            </div>
            <p className="text-gray-400 text-xs ml-9 leading-tight mt-0.5">
              {step === 1 && "Select your employment type and business unit to get started"}
              {step === 2 && "Fill in your details and set a 4-digit PIN to register"}
              {step === 3 && "Enter the OTP sent to your email to verify your identity"}
              {step === 4 && "Provide your joining date, date of birth, gender, and marital status"}
              {step === 5 && "Review your details and complete your registration"}
            </p>
          </motion.div>

          {/* ══ STEP 1: Employment ══ */}
          {step === 1 && (
            <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleNext1} className="flex flex-col gap-2.5">

              {/* Employment Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">Employment Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "intern",    label: "Intern",         icon: "🎓", grad: "from-violet-500 to-purple-600",   light: "bg-violet-50",  ring: "border-violet-400",  text: "text-violet-700"  },
                    { value: "permanent", label: "Full-time",      icon: "🏢", grad: "from-emerald-500 to-teal-600",    light: "bg-emerald-50", ring: "border-emerald-400", text: "text-emerald-700" },
                    { value: "contract",  label: "Contract-based", icon: "📋", grad: "from-amber-500 to-orange-500",    light: "bg-amber-50",   ring: "border-amber-400",   text: "text-amber-700"   },
                  ].map((et) => {
                    const isSelected = form.employment_type === et.value;
                    return (
                      <motion.button key={et.value} type="button"
                        whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.96 }}
                        onClick={() => { setForm((f) => ({ ...f, employment_type: et.value })); setErrors((e) => ({ ...e, employment_type: "" })); }}
                        className={`relative p-3 rounded-xl border-2 text-center transition-all overflow-hidden ${
                          isSelected ? `${et.ring} ${et.light} shadow-md` : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`absolute inset-0 bg-gradient-to-br ${et.grad} opacity-10`} />
                        )}
                        <div className={`w-9 h-9 mx-auto mb-1.5 rounded-lg flex items-center justify-center text-xl shadow-sm ${isSelected ? `bg-gradient-to-br ${et.grad}` : "bg-gray-100"}`}>
                          {et.icon}
                        </div>
                        <p className={`text-xs font-bold leading-tight ${isSelected ? et.text : "text-gray-600"}`}>{et.label}</p>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white shadow flex items-center justify-center">
                            <MdCheckCircle className={`text-xs ${et.text}`} />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {errors.employment_type && <p className="text-xs text-red-500 mt-0.5">{errors.employment_type}</p>}
              </div>

              {/* Business Unit */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-widest">Business Unit *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "mepstra_power_solutions",         label: "Mepstra Power Solutions",                    icon: "⚡", grad: "from-yellow-400 to-orange-500",  light: "bg-orange-50",  ring: "border-orange-400", text: "text-orange-700", desc: "Energy & Power" },
                    { value: "mepstra_engineering_consultancy", label: "Mepstra Engineering & Consultancy Pvt. Ltd.", icon: "🔧", grad: "from-blue-500 to-cyan-500",       light: "bg-blue-50",    ring: "border-blue-400",   text: "text-blue-700",   desc: "Engineering" },
                  ].map((bu) => {
                    const isSelected = form.business_unit === bu.value;
                    return (
                      <motion.button key={bu.value} type="button"
                        whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setForm((f) => ({ ...f, business_unit: bu.value })); setErrors((e) => ({ ...e, business_unit: "" })); }}
                        className={`relative p-3 rounded-xl border-2 text-left flex flex-col gap-1.5 transition-all overflow-hidden ${
                          isSelected ? `${bu.ring} ${bu.light} shadow-md` : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`absolute inset-0 bg-gradient-to-br ${bu.grad} opacity-10`} />
                        )}
                        <div className="flex items-center justify-between relative z-10">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm ${isSelected ? `bg-gradient-to-br ${bu.grad}` : "bg-gray-100"}`}>
                            {bu.icon}
                          </div>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="w-5 h-5 rounded-full bg-white shadow flex items-center justify-center">
                              <MdCheckCircle className={`text-sm ${bu.text}`} />
                            </motion.div>
                          )}
                        </div>
                        <div className="relative z-10">
                          <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isSelected ? bu.text : "text-gray-400"}`}>{bu.desc}</p>
                          <p className={`text-xs font-bold leading-snug ${isSelected ? bu.text : "text-gray-700"}`}>{bu.label}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                {errors.business_unit && <p className="text-xs text-red-500 mt-0.5">{errors.business_unit}</p>}
              </div>

              <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #0f3460 0%, #0d9488 60%, #059669 100%)" }}>
                Register — Continue <MdArrowForward className="text-base" />
              </motion.button>

              <SignInCTA />
            </motion.form>
          )}

          {/* ══ STEP 2: Account Info ══ */}
          {step === 2 && (
            <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleNext2} className="flex flex-col gap-2">

              <div className="grid grid-cols-2 gap-2">
                <InputField label="Full Name *" icon={MdPerson} name="full_name"
                  value={form.full_name} onChange={handleChange} placeholder="John Doe" error={errors.full_name} required />
                <InputField label="Phone" icon={MdPhone} name="phone" value={form.phone} onChange={handleChange}
                  placeholder="9876543210" error={errors.phone} maxLength={10} inputMode="numeric" />
              </div>

              <div>
                <InputField label="Email Address *" icon={MdEmail} type="email" name="email"
                  value={form.email} onChange={handleChange} placeholder="you@mepsrta.com" error={errors.email} required />
                <p className="text-xs text-gray-400 mt-0.5">@mepstra.com / @mepsrta.com, or Gmail containing "mepstra"/"mepsrta"</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">4-Digit PIN *</label>
                  <div className="relative">
                    <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <input type="password" name="pin" value={form.pin} onChange={handleChange}
                      placeholder="••••" maxLength={4} pattern="\d{4}" inputMode="numeric"
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all tracking-widest text-center ${errors.pin ? "border-red-400" : "border-gray-200"}`} />
                  </div>
                  {errors.pin && <p className="text-xs text-red-500 mt-0.5">{errors.pin}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Confirm PIN *</label>
                  <div className="relative">
                    <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <input type="password" name="confirm_pin" value={form.confirm_pin} onChange={handleChange}
                      placeholder="••••" maxLength={4} pattern="\d{4}" inputMode="numeric"
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all tracking-widest text-center ${errors.confirm_pin ? "border-red-400" : "border-gray-200"}`} />
                  </div>
                  {errors.confirm_pin && <p className="text-xs text-red-500 mt-0.5">{errors.confirm_pin}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Role *</label>
                  <div className="relative">
                    <MdWork className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <select name="role" value={form.role} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none">
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Department</label>
                  <div className="relative">
                    <MdBusiness className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <select name="department_id" value={form.department_id} onChange={handleChange}
                      disabled={!form.business_unit}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none">
                      <option value="">{form.business_unit ? "Select Department" : "Select Business Unit First"}</option>
                      {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Reporting Manager
                  {isManagerRole && <span className="ml-2 text-blue-500 normal-case font-normal">(auto-assigned to Admin)</span>}
                </label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  {isManagerRole ? (
                    <div className="w-full pl-10 pr-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50 text-blue-700 font-medium">
                      {adminUser ? `${adminUser.full_name} (admin)` : "Admin"}
                    </div>
                  ) : (
                    <select name="manager_id" value={form.manager_id} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none">
                      <option value="">Select Manager</option>
                      {filteredManagers.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.role.replace("_", " ")})</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:border-gray-300 transition-colors">
                  ← Back
                </motion.button>
                <motion.button type="submit" disabled={otpLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {otpLoading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Sending...</>
                  ) : <><MdSend className="text-sm" /> Send OTP to Register</>}
                </motion.button>
              </div>

              <SignInCTA />
            </motion.form>
          )}

          {/* ══ STEP 3: OTP Verification ══ */}
          {step === 3 && (
            <motion.form key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleVerifyOtp} className="flex flex-col gap-3">

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
                <div className="text-2xl mb-1">📧</div>
                <p className="text-xs text-gray-700 font-medium">OTP sent to</p>
                <p className="text-blue-700 font-bold text-sm">{form.email}</p>
                {otpTimer > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">Expires in <span className="font-bold text-orange-600">{formatTimer(otpTimer)}</span></p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Enter 6-Digit OTP *</label>
                <input type="text" name="otp_code" value={form.otp_code} onChange={handleChange}
                  placeholder="123456" maxLength={6} inputMode="numeric"
                  className={`w-full py-3 text-center text-xl font-bold tracking-[0.4em] border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all ${errors.otp_code ? "border-red-400" : "border-gray-200"}`} />
                {errors.otp_code && <p className="text-xs text-red-500 mt-0.5 text-center">{errors.otp_code}</p>}
              </div>

              <div className="flex gap-2">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold text-sm">
                  ← Back
                </motion.button>
                <motion.button type="button" disabled={otpLoading || otpTimer > 120}
                  onClick={handleSendOtp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="py-2 px-3 bg-gray-100 text-gray-600 rounded-lg font-semibold text-xs disabled:opacity-40 flex items-center gap-1">
                  <MdRefresh /> Resend
                </motion.button>
                <motion.button type="submit" disabled={otpLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {otpLoading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Verifying...</>
                  ) : <><MdCheckCircle className="text-sm" /> Verify OTP</>}
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* ══ STEP 4: Personal Details ══ */}
          {step === 4 && (
            <motion.form key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleNext4} className="flex flex-col gap-3">

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDERS.map((g) => {
                    const isSelected = form.gender === g.value;
                    return (
                      <motion.button key={g.value} type="button"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setForm((f) => ({ ...f, gender: g.value }))}
                        className={`relative flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-all overflow-hidden ${
                          isSelected ? `border-transparent shadow-md ${g.bg}` : "border-gray-200 bg-white hover:border-gray-300"
                        }`}>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`absolute inset-0 bg-gradient-to-br ${g.color} opacity-10`} />
                        )}
                        <span className={`text-2xl font-bold relative z-10 transition-colors ${isSelected ? g.text : "text-gray-300"}`}
                          style={{ fontFamily: "serif", lineHeight: 1 }}>{g.symbol}</span>
                        <p className={`text-xs font-bold relative z-10 transition-colors ${isSelected ? g.text : "text-gray-500"}`}>{g.label}</p>
                        {isSelected && (
                          <motion.div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${g.color}`}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Marital Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {MARITAL_STATUSES.map((ms) => (
                    <motion.button key={ms.value} type="button"
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setForm((f) => ({ ...f, marital_status: ms.value, marriage_date: ms.value === "single" ? "" : f.marriage_date }))}
                      className={`p-2.5 rounded-lg border-2 text-center transition-all ${form.marital_status === ms.value ? "border-teal-500 bg-teal-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}>
                      <div className="text-xl mb-0.5">{ms.icon}</div>
                      <p className="text-sm font-semibold text-gray-700">{ms.label}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                  <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Joining Date</label>
                  <input type="date" name="joining_date" value={form.joining_date} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
                </div>
              </div>

              {form.marital_status === "married" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Marriage Date</label>
                  <input type="date" name="marriage_date" value={form.marriage_date} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
                </div>
              )}

              <div className="flex gap-2 mt-1">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold text-sm">
                  ← Back
                </motion.button>
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-teal-500/30 flex items-center justify-center gap-1.5">
                  Continue <MdArrowForward className="text-sm" />
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* ══ STEP 5: Confirm & Submit ══ */}
          {step === 5 && (
            <motion.form key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit} className="flex flex-col gap-2.5">

              {otpVerified && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100 text-green-700 text-xs font-medium">
                  <MdCheckCircle className="text-green-500" /> Email verified successfully
                </div>
              )}

              <div className="p-3 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
                <p className="text-sm font-bold text-teal-700 mb-3">📋 Review before submitting</p>
                <div className="grid grid-cols-[140px_minmax(0,1fr)] sm:grid-cols-[160px_minmax(0,1fr)] gap-y-2 gap-x-4 text-sm">
                  {[
                    ["Name",           form.full_name],
                    ["Email",          form.email],
                    ["Phone",          form.phone || "—"],
                    ["Role",           form.role.replace("_", " ")],
                    ["Employment",     form.employment_type || "—"],
                    ["Business Unit",  BUSINESS_UNITS.find((b) => b.value === form.business_unit)?.label || "—"],
                    ["Department",     departments.find((d) => d.id === parseInt(form.department_id))?.name || "Not selected"],
                    ["Manager",        managers.find((m) => m.id === parseInt(form.manager_id))?.full_name || "Not selected"],
                    ["Gender",         form.gender || "—"],
                    ["Marital Status", form.marital_status || "—"],
                    ["Date of Birth",  form.date_of_birth || "—"],
                    ["Joining Date",   form.joining_date || "—"],
                    ...(form.marital_status === "married" ? [["Marriage Date", form.marriage_date || "—"]] : []),
                  ].map(([key, val]) => (
                    <div key={key} className="contents">
                      <span className="text-gray-400 font-medium">{key}</span>
                      <span className="font-semibold text-gray-800 break-words whitespace-normal capitalize">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Need to change something?{" "}
                <button type="button" onClick={() => setStep(2)} className="text-teal-600 font-semibold hover:underline">Go back to edit</button>
              </p>

              <div className="flex gap-2">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(4)}
                  className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold text-sm">
                  ← Back
                </motion.button>
                <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Creating...</>
                  ) : "Create Account"}
                </motion.button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </div>

      {/* ── Cookie Banner ── */}
      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-3 bottom-4 z-50 sm:inset-x-6 lg:bottom-5"
          >
            <div className="mx-auto max-w-4xl rounded-[1.5rem] border border-white/75 bg-white/94 p-4 shadow-2xl shadow-slate-900/15 backdrop-blur-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-600">Cookie Notice</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">We use essential cookies to keep registration secure and working properly.</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Optional analytics cookies help us improve performance and usability. You can accept all cookies or continue with essential cookies only.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => handleCookieConsent("essential")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    Essential Only
                  </button>
                  <button type="button" onClick={() => handleCookieConsent("accepted")}
                    className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:brightness-105">
                    Accept All Cookies
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
