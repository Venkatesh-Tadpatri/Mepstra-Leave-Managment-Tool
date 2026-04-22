







// --------------------------------------------------------------------------------------
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { register, getDepartments, getManagers, getAdminUser } from "../services/api";
import api from "../services/api";
import {
  MdPerson, MdEmail, MdLock, MdPhone, MdWork, MdBusiness,
  MdArrowForward, MdCheckCircle, MdSend, MdRefresh,
  MdCalendarMonth, MdEventAvailable, MdBeachAccess, MdHealthAndSafety,
  MdFamilyRestroom, MdAutoAwesome, MdVerified, MdShield,
} from "react-icons/md";
import {
  FaUmbrellaBeach, FaLeaf, FaSun, FaMoon,
  FaCalendarCheck, FaHospital, FaBriefcase,
} from "react-icons/fa";
import CookieConsent from "../components/common/CookieConsent";

/* ─── animation variants ─────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

/* ─── constants ──────────────────────────────────────────── */
const ROLES = [
  { value: "employee",  label: "Employee",  icon: "👤" },
  { value: "team_lead", label: "Team Lead", icon: "👥" },
  { value: "manager",   label: "Manager",   icon: "🏆" },
  { value: "hr",        label: "HR/Admin",  icon: "🎯" },
];

const BUSINESS_UNITS = [
  { value: "mepstra_power_solutions",         label: "Mepstra Power Solutions",                    icon: "⚡" },
  { value: "mepstra_engineering_consultancy", label: "Mepstra Engineering and Consultancy Pvt. Ltd.", icon: "🔧" },
];

const STEPS = ["Employment", "Account", "Verify OTP", "Personal", "Confirm"];
const MANAGER_ROLES = ["manager", "team_lead", "hr"];

const GENDERS = [
  { value: "male",   label: "Male",   symbol: "♂", color: "from-blue-500 to-blue-600",   ring: "ring-blue-400",   bg: "bg-blue-50",   text: "text-blue-700"   },
  { value: "female", label: "Female", symbol: "♀", color: "from-pink-500 to-rose-500",   ring: "ring-pink-400",   bg: "bg-pink-50",   text: "text-pink-700"   },
];

const MARITAL_STATUSES = [
  { value: "single",  label: "Single",  icon: "💼" },
  { value: "married", label: "Married", icon: "💍" },
];

/* ─── leave-type showcase tiles ──────────────────────────── */
const LEAVE_TYPES = [
  { icon: <MdBeachAccess />,       label: "Annual",    color: "from-cyan-400 to-teal-500",    delay: 0    },
  { icon: <MdHealthAndSafety />,   label: "Sick",      color: "from-rose-400 to-pink-500",    delay: 0.15 },
  { icon: <FaUmbrellaBeach />,     label: "Casual",    color: "from-amber-400 to-orange-500", delay: 0.3  },
  { icon: <MdFamilyRestroom />,    label: "Maternity", color: "from-purple-400 to-violet-500",delay: 0.45 },
  { icon: <MdCalendarMonth />,     label: "Privilege", color: "from-emerald-400 to-green-500",delay: 0.6  },
  { icon: <FaHospital />,          label: "Medical",   color: "from-blue-400 to-indigo-500",  delay: 0.75 },
];

/* ─── sub-components ─────────────────────────────────────── */
function MepstraLogo({ size = "md" }) {
  const sizes = {
    sm: { wrap: "px-2 py-1.5", img: "h-7", text1: "text-sm", text2: "text-[10px]" },
    md: { wrap: "px-3 py-2",   img: "h-9", text1: "text-base", text2: "text-[11px]" },
    lg: { wrap: "px-4 py-3",   img: "h-12", text1: "text-xl", text2: "text-xs" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 rounded-2xl bg-white shadow-xl shadow-teal-900/20 border border-white/60 ${sizes.wrap} relative overflow-hidden`}>
      {/* glow behind logo */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-cyan-50 opacity-80" />
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-teal-400/20 rounded-full blur-md" />
      <div className="relative z-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-1.5 shadow-md shadow-teal-500/30">
        <img src="/mepstra-logo.png" alt="Mepstra" className={`${sizes.img} w-auto object-contain filter brightness-0 invert`} />
      </div>
      <div className="relative z-10">
        <p className={`font-black text-gray-900 leading-none tracking-tight ${sizes.text1}`}>Mepstra</p>
        <p className={`text-teal-600 font-semibold leading-none mt-0.5 ${sizes.text2}`}>Smart Leave Portal</p>
      </div>
      {/* verified badge */}
      <div className="relative z-10 ml-auto">
        <MdVerified className="text-teal-500 text-lg" />
      </div>
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

function SignInCTA() {
  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-400 text-center mb-2">Already have an account?</p>
      <Link to="/login"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-blue-400/50 text-blue-700 font-bold text-sm hover:bg-blue-50 hover:border-blue-500 transition-all duration-200">
        <span>Sign In</span>
        <MdArrowForward className="text-base" />
      </Link>
    </div>
  );
}

/* ─── floating leave icon ─────────────────────────────────── */
function FloatingLeafIcon({ icon, label, color, delay, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, rotate: -20 }}
      animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -10, 0] }}
      transition={{ delay, duration: 0.5, y: { duration: 3 + delay, repeat: Infinity, ease: "easeInOut", delay } }}
      className="absolute pointer-events-none"
      style={style}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-xl shadow-lg`}>
        {icon}
      </div>
      <p className="text-[9px] font-bold text-center mt-1 text-white/70 tracking-wide">{label}</p>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
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
    if (name === "full_name") value = value.replace(/\b\w/g, (char) => char.toUpperCase());
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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = "Enter a valid email address";
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Phone must be exactly 10 digits";
    if (!form.pin || !/^\d{4}$/.test(form.pin)) e.pin = "PIN must be exactly 4 digits";
    if (form.pin !== form.confirm_pin) e.confirm_pin = "PINs don't match";
    if (!form.department_id) e.department_id = "Please select a department";
    if (!isManagerRole && !form.manager_id) e.manager_id = "Please select a reporting manager";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext2(ev) {
    ev.preventDefault();
    if (!validateStep2()) return;
    await handleSendOtp();
  }

  async function handleSendOtp() {
    setOtpSendLoading(true);
    try {
      await api.post("/auth/send-otp", { email: form.email.trim().toLowerCase() });
      setOtpSent(true);
      setOtpVerified(false);
      setOtpTimer(120);
      setForm((f) => ({ ...f, otp_code: "" }));
      setErrors((e) => ({ ...e, otp_code: "" }));
      setStep(3);
      toast.success("OTP sent to your email!");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to send OTP";
      setErrors((e) => ({ ...e, email: msg }));
      toast.error(msg);
    } finally {
      setOtpSendLoading(false);
    }
  }

  async function handleVerifyOtp(ev) {
    ev.preventDefault();
    if (!form.otp_code || form.otp_code.length !== 6) {
      setErrors((e) => ({ ...e, otp_code: "Enter the 6-digit OTP" }));
      return;
    }
    if (otpTimer === 0) {
      setErrors((e) => ({ ...e, otp_code: "OTP has expired. Please click Resend to get a new one." }));
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


  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row">

      {/* ══ LEFT PANEL ══════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[40%] h-full relative flex-col justify-between p-5 xl:p-6 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1478cc 0%, #1a9ae8 40%, #20b5f5 70%, #2dd4fa 100%)",
          zIndex: 5,
        }}
      >
        {/* background depth blobs */}
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
            Streamline Your{" "}
            <span className="relative inline-block">
              <span className="text-yellow-300 font-black drop-shadow-sm">
                Leave Journey
              </span>
              <motion.div
                animate={{ scaleX: [0.8, 1.1, 0.8], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-300 to-yellow-200 rounded-full"
              />
            </span>
          </h2>
          <p className="text-white/75 text-sm leading-relaxed mb-4 max-w-xs">
            Join the Mepstra ecosystem — manage leaves, track balances, and get real-time approvals all in one place.
          </p>

          {/* feature pills */}
          <div className="space-y-2">
            {[
              { icon: <MdEventAvailable className="text-sm" />, text: "Instant leave applications",    color: "from-teal-500 to-teal-600",    glow: "shadow-teal-500/30"    },
              { icon: <MdCheckCircle className="text-sm" />,    text: "Multi-level manager approvals", color: "from-emerald-500 to-green-600", glow: "shadow-emerald-500/30" },
              { icon: <MdCalendarMonth className="text-sm" />,  text: "Live balance dashboard",        color: "from-cyan-500 to-sky-600",      glow: "shadow-cyan-500/30"    },
              { icon: <MdAutoAwesome className="text-sm" />,    text: "Smart notifications & alerts",  color: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30"  },
            ].map((f, i) => (
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
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-lg ${f.glow} flex-shrink-0`}>
                  {f.icon}
                </div>
                <span className="text-white text-sm font-semibold drop-shadow-sm">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── bottom: step progress ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }} className="relative z-10">
          <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em] mb-2">Registration Progress</p>
          <div className="flex items-center gap-1 flex-wrap">
            {STEPS.map((label, i) => {
              const s = i + 1;
              return (
                <div key={s} className="flex items-center gap-1">
                  <motion.div
                    animate={step === s ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step > s  ? "bg-white text-blue-600 shadow-md shadow-white/30"
                      : step === s ? "bg-white text-blue-700 shadow-lg shadow-white/40 ring-2 ring-white/50"
                      : "bg-white/20 text-white/70 border border-white/25"
                    }`}>
                    {step > s ? <MdCheckCircle className="text-xs" /> : s}
                  </motion.div>
                  <span className={`text-xs font-semibold ${step >= s ? "text-white" : "text-white/55"}`}>{label}</span>
                  {s < STEPS.length && (
                    <div className={`w-3 h-0.5 rounded-full transition-all ${step > s ? "bg-white/80" : "bg-white/30"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>

      {/* ══ RIGHT FORM PANEL ════════════════════════════════ */}
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
                  <span className="text-base">🏢</span>
                </div>
                <p className="text-[10px] text-white/80 font-semibold tracking-wider uppercase leading-none mt-0.5">Smart Leave Management Portal</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── FORM CARD ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="w-full flex flex-col py-4 px-6 sm:px-10 lg:px-14 xl:px-16 relative z-10 mt-20 rounded-2xl"
          style={{
            background: "#ffffff",
            border: "1px solid rgba(26,154,232,0.12)",
            boxShadow: "0 8px 40px rgba(26,154,232,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
          }}
        >
          {/* top shimmer line */}
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

          {/* step bar (mobile) */}
          <motion.div variants={fadeUp} className="flex gap-1 mb-2 lg:hidden">
            {STEPS.map((_, i) => (
              <div key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  step > i + 1 ? "bg-blue-500"
                  : step === i + 1 ? "bg-gradient-to-r from-blue-400 to-blue-500"
                  : "bg-gray-200"
                }`} />
            ))}
          </motion.div>

          {/* step header */}
          <motion.div variants={fadeUp} className="mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-black shadow-md shadow-blue-500/30 flex-shrink-0">
                {step}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-600/80">Step {step} of {STEPS.length} — Register</p>
                <h2 className="text-lg font-extrabold leading-tight text-gray-900">
                  {step === 1 && "Create Your Account"}
                  {step === 2 && "Account Information"}
                  {step === 3 && "Verify Your Email"}
                  {step === 4 && "Personal Details"}
                  {step === 5 && "Review & Submit"}
                </h2>
              </div>
            </div>
            <p className="text-gray-400 text-xs ml-10 leading-tight mt-0.5">
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
              onSubmit={handleNext1} className="flex flex-col gap-3">

              {/* Employment Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-widest">Employment Type <span className="text-red-500">*</span></label>
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
                          isSelected ? `${et.ring} ${et.light} shadow-lg` : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                        }`}>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`absolute inset-0 bg-gradient-to-br ${et.grad} opacity-[0.08]`} />
                        )}
                        <div className={`relative z-10 w-9 h-9 mx-auto mb-1.5 rounded-lg flex items-center justify-center text-2xl shadow-sm transition-all ${isSelected ? "bg-white shadow-md" : "bg-gray-100"}`}>
                          {et.icon}
                        </div>
                        <p className={`relative z-10 text-xs font-bold leading-tight ${isSelected ? et.text : "text-gray-600"}`}>{et.label}</p>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-gradient-to-br ${et.grad} shadow flex items-center justify-center`}>
                            <MdCheckCircle className="text-xs text-white" />
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
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-widest">Business Unit <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "mepstra_power_solutions",         label: "Mepstra Power Solutions",                    icon: "⚡", grad: "from-yellow-400 to-orange-500",  light: "bg-orange-50",  ring: "border-orange-400", text: "text-orange-700", desc: "Energy & Power"  },
                    { value: "mepstra_engineering_consultancy", label: "Mepstra Engineering & Consultancy Pvt. Ltd.", icon: "🔧", grad: "from-blue-500 to-cyan-500",       light: "bg-blue-50",    ring: "border-blue-400",   text: "text-blue-700",   desc: "Engineering"    },
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
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl shadow-sm transition-all ${isSelected ? "bg-white shadow-md" : "bg-gray-100"}`}>
                            {bu.icon}
                          </div>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className={`w-5 h-5 rounded-full bg-gradient-to-br ${bu.grad} shadow flex items-center justify-center`}>
                              <MdCheckCircle className="text-xs text-white" />
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
                style={{ background: "linear-gradient(135deg, #1478cc 0%, #1a9ae8 60%, #20b5f5 100%)", boxShadow: "0 4px 20px rgba(26,154,232,0.4)" }}>
                Continue to Register <MdArrowForward className="text-base" />
              </motion.button>

              <SignInCTA />
            </motion.form>
          )}

          {/* ══ STEP 2: Account Info ══ */}
          {step === 2 && (
            <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleNext2} className="flex flex-col gap-2">

              <div className="grid grid-cols-2 gap-2">
                <InputField label={<>Full Name <span className="text-red-500">*</span></>} icon={MdPerson} name="full_name"
                  value={form.full_name} onChange={handleChange} placeholder="John Doe" error={errors.full_name} required />
                <InputField label="Phone" icon={MdPhone} name="phone" value={form.phone} onChange={handleChange}
                  placeholder="9876543210" error={errors.phone} maxLength={10} inputMode="numeric" />
              </div>

              <div>
                <InputField label={<>Email Address <span className="text-red-500">*</span></>} icon={MdEmail} type="email" name="email"
                  value={form.email} onChange={handleChange} placeholder="you@mepstra.com" error={errors.email} required />
                <p className="text-xs text-amber-600 mt-0.5 font-medium">⚠ Only pre-approved company emails can register.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">4-Digit PIN <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <input type="password" name="pin" value={form.pin} onChange={handleChange}
                      placeholder="••••" maxLength={4} pattern="\d{4}" inputMode="numeric"
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all tracking-widest text-center ${errors.pin ? "border-red-400" : "border-gray-200"}`} />
                  </div>
                  {errors.pin && <p className="text-xs text-red-500 mt-0.5">{errors.pin}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Confirm PIN <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <input type="password" name="confirm_pin" value={form.confirm_pin} onChange={handleChange}
                      placeholder="••••" maxLength={4} pattern="\d{4}" inputMode="numeric"
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all tracking-widest text-center ${errors.confirm_pin ? "border-red-400" : "border-gray-200"}`} />
                  </div>
                  {errors.confirm_pin && <p className="text-xs text-red-500 mt-0.5">{errors.confirm_pin}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Role <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MdWork className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <select name="role" value={form.role} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all appearance-none">
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.icon} {r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <MdBusiness className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                    <select name="department_id" value={form.department_id} onChange={handleChange}
                      disabled={!form.business_unit}
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all appearance-none disabled:opacity-60 ${errors.department_id ? "border-red-400" : "border-gray-200"}`}>
                      <option value="">{form.business_unit ? "Select Department" : "Select Business Unit First"}</option>
                      {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  {errors.department_id && <p className="text-xs text-red-500 mt-0.5">{errors.department_id}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Reporting Manager {!isManagerRole && <span className="text-red-500">*</span>}
                  {isManagerRole && <span className="ml-2 text-teal-500 normal-case font-normal">(auto-assigned to Admin)</span>}
                </label>
                <div className="relative">
                  <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
                  {isManagerRole ? (
                    <div className="w-full pl-10 pr-3 py-2 text-sm border border-teal-200 rounded-lg bg-teal-50 text-teal-700 font-medium">
                      {adminUser ? `${adminUser.full_name} (admin)` : "Admin"}
                    </div>
                  ) : (
                    <select name="manager_id" value={form.manager_id} onChange={handleChange}
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all appearance-none ${errors.manager_id ? "border-red-400" : "border-gray-200"}`}>
                      <option value="">Select Manager</option>
                      {filteredManagers.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.role.replace("_", " ")})</option>)}
                    </select>
                  )}
                </div>
                {errors.manager_id && <p className="text-xs text-red-500 mt-0.5">{errors.manager_id}</p>}
              </div>

              <div className="flex gap-2 mt-1">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:border-gray-300 transition-colors">
                  ← Back
                </motion.button>
                <motion.button type="submit" disabled={otpSendLoading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {otpSendLoading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Sending...</>
                  ) : <><MdSend className="text-sm" /> Send OTP</>}
                </motion.button>
              </div>

              <SignInCTA />
            </motion.form>
          )}

          {/* ══ STEP 3: OTP ══ */}
          {step === 3 && (
            <motion.form key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleVerifyOtp} className="flex flex-col gap-3">

              <div className="p-4 rounded-xl text-center"
                style={{ background: "linear-gradient(135deg, #eff6ff, #f0fdf4)", border: "1px solid rgba(20,184,166,0.2)" }}>
                <div className="text-3xl mb-1">📧</div>
                <p className="text-xs text-gray-500 font-medium">OTP sent to</p>
                <p className="text-teal-700 font-bold text-sm">{form.email}</p>
                {otpTimer > 0 ? (
                  <p className="text-sm font-semibold text-gray-600 mt-1">Expires in <span className="text-lg font-extrabold text-orange-500">{formatTimer(otpTimer)}</span></p>
                ) : (
                  <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-bold text-red-600">⏰ OTP Expired!</p>
                    <p className="text-xs text-red-500 mt-0.5">Please click <strong>Resend</strong> to get a new OTP and verify again.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Enter 6-Digit OTP <span className="text-red-500">*</span></label>
                <input type="text" name="otp_code" value={form.otp_code} onChange={handleChange}
                  placeholder="123456" maxLength={6} inputMode="numeric"
                  className={`w-full py-3 text-center text-2xl font-black tracking-[0.5em] border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all ${errors.otp_code ? "border-red-400" : "border-gray-200"}`} />
                {errors.otp_code && <p className="text-xs text-red-500 mt-0.5 text-center">{errors.otp_code}</p>}
              </div>

              <div className="flex gap-2">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold text-sm">
                  ← Back
                </motion.button>
                <motion.button type="button" disabled={otpSendLoading || otpTimer > 0}
                  onClick={handleSendOtp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="py-2 px-3 bg-gray-100 text-gray-600 rounded-lg font-semibold text-xs disabled:opacity-40 flex items-center gap-1">
                  {otpSendLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-600 rounded-full" /> : <MdRefresh />}
                  {otpSendLoading ? "Sending..." : "Resend"}
                </motion.button>
                <motion.button type="submit" disabled={otpLoading || otpTimer === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-teal-500/30 disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {otpLoading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Verifying...</>
                  ) : <><MdCheckCircle className="text-sm" /> Verify</>}
                </motion.button>
              </div>
            </motion.form>
          )}

          {/* ══ STEP 4: Personal Details ══ */}
          {step === 4 && (
            <motion.form key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleNext4} className="flex flex-col gap-3">

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Gender</label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDERS.map((g) => {
                    const isSelected = form.gender === g.value;
                    return (
                      <motion.button key={g.value} type="button"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setForm((f) => ({ ...f, gender: g.value }))}
                        className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all overflow-hidden ${
                          isSelected ? `border-transparent shadow-md ${g.bg}` : "border-gray-200 bg-white hover:border-gray-300"
                        }`}>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className={`absolute inset-0 bg-gradient-to-br ${g.color} opacity-10`} />
                        )}
                        <span className={`text-2xl font-bold relative z-10 ${isSelected ? g.text : "text-gray-300"}`}
                          style={{ fontFamily: "serif", lineHeight: 1 }}>{g.symbol}</span>
                        <p className={`text-xs font-bold relative z-10 ${isSelected ? g.text : "text-gray-500"}`}>{g.label}</p>
                        {isSelected && (
                          <motion.div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${g.color}`}
                            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3 }} />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Marital Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Marital Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {MARITAL_STATUSES.map((ms) => (
                    <motion.button key={ms.value} type="button"
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setForm((f) => ({ ...f, marital_status: ms.value, marriage_date: ms.value === "single" ? "" : f.marriage_date }))}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${form.marital_status === ms.value ? "border-teal-500 bg-teal-50 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
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
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Joining Date</label>
                  <input type="date" name="joining_date" value={form.joining_date} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all" />
                </div>
              </div>

              {form.marital_status === "married" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Marriage Date</label>
                  <input type="date" name="marriage_date" value={form.marriage_date} onChange={handleChange}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all" />
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
                  <MdCheckCircle className="text-green-500 flex-shrink-0" /> Email verified successfully
                </div>
              )}

              <div className="p-3 rounded-xl"
                style={{ background: "linear-gradient(135deg, #f0fdf4, #eff6ff)", border: "1px solid rgba(20,184,166,0.2)" }}>
                <p className="text-sm font-bold text-teal-700 mb-3">📋 Review before submitting</p>
                <div className="grid grid-cols-[130px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)] gap-y-1.5 gap-x-3 text-sm">
                  {[
                    ["Name",           form.full_name],
                    ["Email",          form.email.trim().toLowerCase()],
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
                      <span className="text-gray-400 font-medium text-xs">{key}</span>
                      <span className="font-semibold text-gray-800 break-words whitespace-normal capitalize text-xs">{val}</span>
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
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #0f3460 0%, #0d9488 60%, #059669 100%)", boxShadow: "0 4px 20px rgba(13,148,136,0.4)" }}>
                  {loading ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Creating Account...</>
                  ) : <><MdCheckCircle className="text-base" /> Create Account</>}
                </motion.button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </div>

      <CookieConsent />
    </div>
  );
}

// ------------------------------------------------------------------------------------

// home page design sample 2 
// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { motion, AnimatePresence } from "framer-motion";
// import toast from "react-hot-toast";
// import { register, getDepartments, getManagers, getAdminUser } from "../services/api";
// import api from "../services/api";
// import {
//   MdPerson, MdEmail, MdLock, MdPhone, MdWork, MdBusiness,
//   MdArrowForward, MdCheckCircle, MdSend, MdRefresh, MdVisibility, MdVisibilityOff,
// } from "react-icons/md";
// import CookieConsent from "../components/common/CookieConsent";

// /* ─── constants ─────────────────────────────────────────── */
// const ROLES = [
//   { value: "employee",  label: "Employee",  icon: "👤" },
//   { value: "team_lead", label: "Team Lead", icon: "👥" },
//   { value: "manager",   label: "Manager",   icon: "🏆" },
//   { value: "hr",        label: "HR",        icon: "🎯" },
// ];

// const BUSINESS_UNITS = [
//   { value: "mepstra_power_solutions",         label: "Mepstra Power Solutions",                       short: "Power Solutions",       icon: "⚡" },
//   { value: "mepstra_engineering_consultancy", label: "Mepstra Engineering & Consultancy Pvt. Ltd.",   short: "Engineering",           icon: "🔧" },
// ];

// const EMPLOYMENT_TYPES = [
//   { value: "intern",    label: "Intern",    icon: "🎓" },
//   { value: "permanent", label: "Full-time", icon: "🏢" },
//   { value: "contract",  label: "Contract",  icon: "📋" },
// ];

// const GENDERS = [
//   { value: "male",   label: "Male",   symbol: "♂" },
//   { value: "female", label: "Female", symbol: "♀" },
// ];

// const MARITAL_STATUSES = [
//   { value: "single",  label: "Single",  icon: "💼" },
//   { value: "married", label: "Married", icon: "💍" },
// ];

// const MANAGER_ROLES = ["manager", "team_lead", "hr"];

// /* ─── tiny sub-components ───────────────────────────────── */
// function Label({ children, required }) {
//   return (
//     <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#94a3b8" }}>
//       {children}{required && <span className="text-rose-400 ml-0.5">*</span>}
//     </label>
//   );
// }

// function Field({ label, icon: Icon, error, required, suffix, ...props }) {
//   return (
//     <div>
//       {label && <Label required={required}>{label}</Label>}
//       <div className="relative">
//         {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base z-10" />}
//         <input
//           {...props}
//           className={`w-full ${Icon ? "pl-10" : "pl-3.5"} ${suffix ? "pr-10" : "pr-3.5"} py-2.5 text-sm font-medium rounded-xl border transition-all outline-none
//             bg-slate-800/60 text-slate-100 placeholder-slate-600
//             ${error ? "border-rose-500/70 focus:border-rose-400" : "border-slate-700/60 focus:border-teal-500/70"}
//             focus:ring-2 ${error ? "focus:ring-rose-500/10" : "focus:ring-teal-500/10"}`}
//         />
//         {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
//       </div>
//       {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
//     </div>
//   );
// }

// function SelectField({ label, icon: Icon, error, required, children, ...props }) {
//   return (
//     <div>
//       {label && <Label required={required}>{label}</Label>}
//       <div className="relative">
//         {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base z-10 pointer-events-none" />}
//         <select
//           {...props}
//           className={`w-full ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 py-2.5 text-sm font-medium rounded-xl border transition-all outline-none appearance-none
//             bg-slate-800/60 text-slate-100
//             ${error ? "border-rose-500/70" : "border-slate-700/60 focus:border-teal-500/70"}
//             focus:ring-2 focus:ring-teal-500/10`}
//         >
//           {children}
//         </select>
//       </div>
//       {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
//     </div>
//   );
// }

// function SectionTitle({ num, title }) {
//   return (
//     <div className="flex items-center gap-3 mb-4">
//       <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-slate-900 flex-shrink-0"
//         style={{ background: "linear-gradient(135deg,#2dd4bf,#06b6d4)" }}>
//         {num}
//       </div>
//       <span className="text-xs font-bold uppercase tracking-widest text-teal-400">{title}</span>
//       <div className="flex-1 h-px bg-gradient-to-r from-teal-500/20 to-transparent" />
//     </div>
//   );
// }

// /* ─── main component ─────────────────────────────────────── */
// export default function RegisterPage() {
//   const navigate = useNavigate();
//   const [departments, setDepartments] = useState([]);
//   const [managers, setManagers] = useState([]);
//   const [adminUser, setAdminUser] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [otpSent, setOtpSent] = useState(false);
//   const [otpVerified, setOtpVerified] = useState(false);
//   const [otpLoading, setOtpLoading] = useState(false);
//   const [otpTimer, setOtpTimer] = useState(0);
//   const [showPin, setShowPin] = useState(false);
//   const [showConfirmPin, setShowConfirmPin] = useState(false);
//   const [errors, setErrors] = useState({});

//   const [form, setForm] = useState({
//     employment_type: "", business_unit: "",
//     full_name: "", email: "", pin: "", confirm_pin: "",
//     phone: "", role: "employee",
//     otp_code: "",
//     department_id: "", manager_id: "",
//     gender: "", joining_date: "", date_of_birth: "",
//     marital_status: "", marriage_date: "",
//   });

//   useEffect(() => {
//     Promise.all([getDepartments(), getManagers(), getAdminUser()])
//       .then(([depts, mgrs, admin]) => {
//         setDepartments(depts.data);
//         setManagers(mgrs.data);
//         setAdminUser(admin.data);
//       }).catch(() => {});
//   }, []);

//   const isManagerRole = MANAGER_ROLES.includes(form.role);

//   useEffect(() => {
//     if (isManagerRole && adminUser) setForm((f) => ({ ...f, manager_id: String(adminUser.id) }));
//     else if (!isManagerRole) setForm((f) => ({ ...f, manager_id: "" }));
//   }, [form.role, adminUser]);

//   const filteredDepartments = departments.filter((d) => d.business_unit === form.business_unit);
//   const filteredManagers = form.department_id
//     ? managers.filter((m) => m.department && String(m.department.id) === String(form.department_id))
//     : managers;

//   useEffect(() => {
//     if (!form.department_id) return;
//     const valid = departments.some((d) => d.business_unit === form.business_unit && String(d.id) === String(form.department_id));
//     if (!valid) { setForm((f) => ({ ...f, department_id: "", manager_id: "" })); return; }
//     if (form.manager_id) {
//       const validMgr = managers.find((m) => String(m.id) === String(form.manager_id) && m.department && String(m.department.id) === String(form.department_id));
//       if (!validMgr) setForm((f) => ({ ...f, manager_id: "" }));
//     }
//   }, [form.department_id, form.business_unit, departments, managers]);

//   useEffect(() => {
//     if (otpTimer <= 0) return;
//     const id = setInterval(() => setOtpTimer((t) => t - 1), 1000);
//     return () => clearInterval(id);
//   }, [otpTimer]);

//   function handleChange(e) {
//     let { name, value } = e.target;
//     if (name === "phone") value = value.replace(/\D/g, "").slice(0, 10);
//     if (name === "email") value = value.trim().toLowerCase();
//     if (name === "full_name") value = value.replace(/\b\w/g, (c) => c.toUpperCase());
//     setForm((f) => ({ ...f, [name]: value }));
//     if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
//   }

//   async function handleSendOtp() {
//     const e = {};
//     if (!form.email) e.email = "Required";
//     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
//     if (Object.keys(e).length) { setErrors((prev) => ({ ...prev, ...e })); return; }
//     setOtpLoading(true);
//     try {
//       await api.post("/auth/send-otp", { email: form.email });
//       setOtpSent(true);
//       setOtpVerified(false);
//       setOtpTimer(120);
//       toast.success("OTP sent to your email!");
//     } catch (err) {
//       const msg = err.response?.data?.detail || "Failed to send OTP";
//       setErrors((prev) => ({ ...prev, email: msg }));
//       toast.error(msg);
//     } finally { setOtpLoading(false); }
//   }

//   async function handleVerifyOtp() {
//     if (!form.otp_code || form.otp_code.length !== 6) {
//       setErrors((e) => ({ ...e, otp_code: "Enter the 6-digit OTP" })); return;
//     }
//     setOtpLoading(true);
//     try {
//       await api.post("/auth/verify-otp", { email: form.email, otp: form.otp_code });
//       setOtpVerified(true);
//       setErrors((e) => ({ ...e, otp_code: "" }));
//       toast.success("Email verified!");
//     } catch (err) {
//       setErrors((e) => ({ ...e, otp_code: err.response?.data?.detail || "Invalid OTP" }));
//     } finally { setOtpLoading(false); }
//   }

//   async function handleSubmit(ev) {
//     ev.preventDefault();
//     const e = {};
//     if (!form.employment_type) e.employment_type = "Select employment type";
//     if (!form.business_unit) e.business_unit = "Select business unit";
//     if (!form.full_name) e.full_name = "Required";
//     if (!form.email) e.email = "Required";
//     else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
//     if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Must be 10 digits";
//     if (!form.pin || !/^\d{4}$/.test(form.pin)) e.pin = "Must be 4 digits";
//     if (form.pin !== form.confirm_pin) e.confirm_pin = "PINs don't match";
//     if (!otpVerified) e.otp_code = "Please verify your email first";
//     if (Object.keys(e).length) { setErrors(e); toast.error("Please fix the errors above"); return; }

//     setLoading(true);
//     try {
//       await register({
//         email: form.email,
//         full_name: form.full_name,
//         password: form.pin,
//         phone: form.phone || undefined,
//         role: form.role,
//         employment_type: form.employment_type || undefined,
//         business_unit: form.business_unit || undefined,
//         department_id: form.department_id ? parseInt(form.department_id) : undefined,
//         manager_id: form.manager_id ? parseInt(form.manager_id) : undefined,
//         otp_code: form.otp_code,
//         joining_date: form.joining_date || undefined,
//         date_of_birth: form.date_of_birth || undefined,
//         gender: form.gender || undefined,
//         marital_status: form.marital_status || undefined,
//         marriage_date: form.marital_status === "married" ? (form.marriage_date || undefined) : undefined,
//       });
//       toast.success("Account created! Please login.");
//       navigate("/login");
//     } catch (err) {
//       toast.error(err.response?.data?.detail || "Registration failed");
//     } finally { setLoading(false); }
//   }

//   const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

//   return (
//     <div className="min-h-screen flex" style={{ background: "#060d1a", fontFamily: "'DM Sans', sans-serif" }}>

//       {/* Google Fonts */}
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
//         .syne { font-family: 'Syne', sans-serif; }
//         .scrollbar-hide::-webkit-scrollbar { display: none; }
//         .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
//         .chip-btn { transition: all 0.2s; }
//         .chip-btn:hover { transform: translateY(-1px); }
//         .chip-btn.active { box-shadow: 0 0 0 1.5px #2dd4bf, 0 4px 16px rgba(45,212,191,0.18); }
//         input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5) sepia(1) saturate(0.5); }
//         select option { background: #1e293b; color: #e2e8f0; }
//       `}</style>

//       {/* ── Left decorative panel ── */}
//       <div className="hidden lg:flex lg:w-[400px] xl:w-[460px] flex-shrink-0 relative flex-col justify-between p-8 xl:p-10 overflow-hidden"
//         style={{ background: "linear-gradient(160deg,#0a1628 0%,#0c2340 40%,#071525 100%)" }}>

//         {/* Glows */}
//         <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
//           style={{ background: "radial-gradient(circle,rgba(45,212,191,0.12) 0%,transparent 70%)" }} />
//         <div className="absolute bottom-20 left-0 w-64 h-64 rounded-full pointer-events-none"
//           style={{ background: "radial-gradient(circle,rgba(6,182,212,0.10) 0%,transparent 70%)" }} />

//         {/* Grid texture */}
//         <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
//           style={{ backgroundImage: "linear-gradient(rgba(45,212,191,1) 1px,transparent 1px),linear-gradient(90deg,rgba(45,212,191,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

//         {/* Floating orbs */}
//         {[
//           { top: "18%", left: "12%", size: 6, delay: 0 },
//           { top: "42%", left: "78%", size: 4, delay: 1.1 },
//           { top: "68%", left: "22%", size: 5, delay: 2.0 },
//           { top: "82%", left: "65%", size: 3, delay: 0.6 },
//           { top: "10%", left: "60%", size: 4, delay: 1.7 },
//         ].map((d, i) => (
//           <motion.div key={i}
//             animate={{ y: [-10, 10, -10], opacity: [0.3, 0.9, 0.3] }}
//             transition={{ duration: 3 + i * 0.6, repeat: Infinity, delay: d.delay }}
//             className="absolute rounded-full bg-teal-400/50 pointer-events-none"
//             style={{ top: d.top, left: d.left, width: d.size, height: d.size }} />
//         ))}

//         {/* Logo */}
//         <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
//           <div className="inline-flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-2xl">
//             <img src="/mepstra-logo.png" alt="Mepstra" className="h-9 w-auto object-contain" />
//             <div className="border-l border-slate-200 pl-3">
//               <p className="text-sm font-extrabold text-slate-800 leading-none syne">Mepstra</p>
//               <p className="text-[10px] text-slate-500 mt-0.5">Leave Management</p>
//             </div>
//           </div>
//         </motion.div>

//         {/* Hero text */}
//         <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
//           <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-500 mb-3">Smart Leave Platform</p>
//           <h1 className="syne text-3xl xl:text-4xl font-extrabold text-white leading-[1.15] mb-4">
//             Manage leaves<br />
//             <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">effortlessly.</span>
//           </h1>
//           <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-xs">
//             One platform for leave requests, approvals, and real-time tracking across your entire organisation.
//           </p>

//           <div className="space-y-3">
//             {[
//               { icon: "🚀", label: "Instant leave applications" },
//               { icon: "✅", label: "Multi-level approvals" },
//               { icon: "📊", label: "Live balance tracking" },
//               { icon: "🔔", label: "Real-time email alerts" },
//             ].map((f, i) => (
//               <motion.div key={i}
//                 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: 0.4 + i * 0.08 }}
//                 className="flex items-center gap-3 group">
//                 <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
//                   style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.2)" }}>
//                   {f.icon}
//                 </div>
//                 <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">{f.label}</span>
//               </motion.div>
//             ))}
//           </div>
//         </motion.div>

//         {/* Bottom sign-in nudge */}
//         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
//           className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
//           <p className="text-xs text-slate-400 mb-3">Already have an account?</p>
//           <Link to="/login"
//             className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-teal-400 transition-all hover:text-white"
//             style={{ background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.25)" }}>
//             Sign In <MdArrowForward />
//           </Link>
//         </motion.div>
//       </div>

//       {/* ── Right form panel ── */}
//       <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">

//         {/* Mobile top bar */}
//         <div className="lg:hidden flex items-center justify-between px-5 py-4"
//           style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
//           <div className="flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2">
//             <img src="/mepstra-logo.png" alt="Mepstra" className="h-7 w-auto" />
//             <span className="text-sm font-extrabold text-slate-800 syne">Mepstra</span>
//           </div>
//           <Link to="/login" className="text-xs font-bold text-teal-400 flex items-center gap-1">
//             Sign In <MdArrowForward className="text-sm" />
//           </Link>
//         </div>

//         {/* Teal top accent line */}
//         <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,#0f766e,#2dd4bf,#06b6d4,#0f766e)" }} />

//         <div className="flex-1 flex items-start justify-center px-5 sm:px-8 py-8">
//           <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
//             className="w-full max-w-2xl">

//             {/* Page header */}
//             <div className="mb-8">
//               <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-500 mb-1">Create account</p>
//               <h2 className="syne text-2xl sm:text-3xl font-extrabold text-white">Register to Mepstra</h2>
//               <p className="text-sm text-slate-500 mt-1">Fill in all details below — no steps, one smooth form.</p>
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-8">

//               {/* ── Section 1: Employment ── */}
//               <div className="p-5 sm:p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 <SectionTitle num="1" title="Employment Details" />

//                 <div className="space-y-5">
//                   {/* Employment Type */}
//                   <div>
//                     <Label required>Employment Type</Label>
//                     <div className="grid grid-cols-3 gap-2.5">
//                       {EMPLOYMENT_TYPES.map((et) => {
//                         const active = form.employment_type === et.value;
//                         return (
//                           <button key={et.value} type="button"
//                             onClick={() => { setForm((f) => ({ ...f, employment_type: et.value })); setErrors((e) => ({ ...e, employment_type: "" })); }}
//                             className={`chip-btn relative flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border text-center ${active ? "active" : ""}`}
//                             style={{
//                               background: active ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
//                               borderColor: active ? "#2dd4bf" : "rgba(255,255,255,0.09)",
//                             }}>
//                             <span className="text-xl">{et.icon}</span>
//                             <span className={`text-xs font-bold ${active ? "text-teal-300" : "text-slate-400"}`}>{et.label}</span>
//                             {active && (
//                               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
//                                 className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-400 flex items-center justify-center">
//                                 <MdCheckCircle className="text-[10px] text-slate-900" />
//                               </motion.div>
//                             )}
//                           </button>
//                         );
//                       })}
//                     </div>
//                     {errors.employment_type && <p className="text-[11px] text-rose-400 mt-1.5">{errors.employment_type}</p>}
//                   </div>

//                   {/* Business Unit */}
//                   <div>
//                     <Label required>Business Unit</Label>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
//                       {BUSINESS_UNITS.map((bu) => {
//                         const active = form.business_unit === bu.value;
//                         return (
//                           <button key={bu.value} type="button"
//                             onClick={() => { setForm((f) => ({ ...f, business_unit: bu.value })); setErrors((e) => ({ ...e, business_unit: "" })); }}
//                             className={`chip-btn relative flex items-center gap-3 p-3.5 rounded-xl border text-left ${active ? "active" : ""}`}
//                             style={{
//                               background: active ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
//                               borderColor: active ? "#2dd4bf" : "rgba(255,255,255,0.09)",
//                             }}>
//                             <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
//                               style={{ background: active ? "rgba(45,212,191,0.2)" : "rgba(255,255,255,0.06)" }}>
//                               {bu.icon}
//                             </div>
//                             <div className="min-w-0">
//                               <p className={`text-xs font-bold leading-snug ${active ? "text-teal-300" : "text-slate-300"}`}>{bu.short}</p>
//                               <p className="text-[10px] text-slate-500 truncate">{bu.label}</p>
//                             </div>
//                             {active && (
//                               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
//                                 className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-teal-400 flex items-center justify-center flex-shrink-0">
//                                 <MdCheckCircle className="text-[10px] text-slate-900" />
//                               </motion.div>
//                             )}
//                           </button>
//                         );
//                       })}
//                     </div>
//                     {errors.business_unit && <p className="text-[11px] text-rose-400 mt-1.5">{errors.business_unit}</p>}
//                   </div>
//                 </div>
//               </div>

//               {/* ── Section 2: Account Info ── */}
//               <div className="p-5 sm:p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 <SectionTitle num="2" title="Account Information" />

//                 <div className="space-y-4">
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <Field label="Full Name" icon={MdPerson} name="full_name" value={form.full_name}
//                       onChange={handleChange} placeholder="John Doe" error={errors.full_name} required />
//                     <Field label="Phone" icon={MdPhone} name="phone" value={form.phone}
//                       onChange={handleChange} placeholder="9876543210" error={errors.phone} inputMode="numeric" maxLength={10} />
//                   </div>

//                   {/* Email + OTP inline */}
//                   <div>
//                     <Label required>Email Address</Label>
//                     <div className="flex gap-2">
//                       <div className="relative flex-1">
//                         <MdEmail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base z-10" />
//                         <input type="email" name="email" value={form.email} onChange={handleChange}
//                           placeholder="you@mepstra.com"
//                           className={`w-full pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border transition-all outline-none
//                             bg-slate-800/60 text-slate-100 placeholder-slate-600
//                             ${errors.email ? "border-rose-500/70 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10" : "border-slate-700/60 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/10"}`} />
//                         {otpVerified && (
//                           <MdCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 text-base" />
//                         )}
//                       </div>
//                       <motion.button type="button" onClick={handleSendOtp} disabled={otpLoading || otpVerified}
//                         whileTap={{ scale: 0.96 }}
//                         className="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
//                         style={{
//                           background: otpVerified ? "rgba(45,212,191,0.15)" : "linear-gradient(135deg,#0f766e,#0891b2)",
//                           color: otpVerified ? "#2dd4bf" : "#fff",
//                           border: otpVerified ? "1px solid #2dd4bf" : "none",
//                         }}>
//                         {otpVerified ? <><MdCheckCircle /> Verified</> :
//                           otpLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
//                             className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> :
//                             <><MdSend className="text-xs" /> {otpSent ? "Resend" : "Send OTP"}</>}
//                       </motion.button>
//                     </div>
//                     {errors.email && <p className="text-[11px] text-rose-400 mt-1">{errors.email}</p>}
//                     {!otpVerified && <p className="text-[11px] text-amber-500/80 mt-1">⚠ Only pre-approved company emails can register.</p>}
//                   </div>

//                   {/* OTP input — shown after send */}
//                   <AnimatePresence>
//                     {otpSent && !otpVerified && (
//                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
//                         <div className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-end gap-3"
//                           style={{ background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.2)" }}>
//                           <div className="flex-1">
//                             <Label>OTP sent to {form.email}</Label>
//                             {otpTimer > 0 && (
//                               <p className="text-[11px] text-amber-400 mb-2">Expires in <span className="font-bold">{formatTimer(otpTimer)}</span></p>
//                             )}
//                             <input type="text" name="otp_code" value={form.otp_code} onChange={handleChange}
//                               placeholder="Enter 6-digit OTP" maxLength={6} inputMode="numeric"
//                               className={`w-full px-4 py-2.5 text-sm font-bold text-center tracking-[0.4em] rounded-xl border outline-none transition-all
//                                 bg-slate-800/80 text-slate-100 placeholder-slate-600 placeholder:tracking-normal
//                                 ${errors.otp_code ? "border-rose-500/70" : "border-slate-700/60 focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/10"}`} />
//                             {errors.otp_code && <p className="text-[11px] text-rose-400 mt-1">{errors.otp_code}</p>}
//                           </div>
//                           <motion.button type="button" onClick={handleVerifyOtp} disabled={otpLoading}
//                             whileTap={{ scale: 0.96 }}
//                             className="flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60"
//                             style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
//                             {otpLoading
//                               ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
//                                   className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
//                               : <><MdCheckCircle className="text-sm" /> Verify</>}
//                           </motion.button>
//                         </div>
//                       </motion.div>
//                     )}
//                   </AnimatePresence>

//                   {/* PIN row */}
//                   <div className="grid grid-cols-2 gap-4">
//                     <div>
//                       <Label required>4-Digit PIN</Label>
//                       <div className="relative">
//                         <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base z-10" />
//                         <input type={showPin ? "text" : "password"} name="pin" value={form.pin} onChange={handleChange}
//                           placeholder="••••" maxLength={4} inputMode="numeric"
//                           className={`w-full pl-10 pr-10 py-2.5 text-sm font-bold text-center tracking-[0.5em] rounded-xl border outline-none transition-all
//                             bg-slate-800/60 text-slate-100 placeholder-slate-600 placeholder:tracking-normal
//                             ${errors.pin ? "border-rose-500/70" : "border-slate-700/60 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/10"}`} />
//                         <button type="button" onClick={() => setShowPin(!showPin)}
//                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
//                           {showPin ? <MdVisibilityOff className="text-base" /> : <MdVisibility className="text-base" />}
//                         </button>
//                       </div>
//                       {errors.pin && <p className="text-[11px] text-rose-400 mt-1">{errors.pin}</p>}
//                     </div>
//                     <div>
//                       <Label required>Confirm PIN</Label>
//                       <div className="relative">
//                         <MdLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-base z-10" />
//                         <input type={showConfirmPin ? "text" : "password"} name="confirm_pin" value={form.confirm_pin} onChange={handleChange}
//                           placeholder="••••" maxLength={4} inputMode="numeric"
//                           className={`w-full pl-10 pr-10 py-2.5 text-sm font-bold text-center tracking-[0.5em] rounded-xl border outline-none transition-all
//                             bg-slate-800/60 text-slate-100 placeholder-slate-600 placeholder:tracking-normal
//                             ${errors.confirm_pin ? "border-rose-500/70" : "border-slate-700/60 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/10"}`} />
//                         <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)}
//                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
//                           {showConfirmPin ? <MdVisibilityOff className="text-base" /> : <MdVisibility className="text-base" />}
//                         </button>
//                       </div>
//                       {errors.confirm_pin && <p className="text-[11px] text-rose-400 mt-1">{errors.confirm_pin}</p>}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* ── Section 3: Role & Department ── */}
//               <div className="p-5 sm:p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 <SectionTitle num="3" title="Role & Department" />

//                 <div className="space-y-4">
//                   {/* Role chips */}
//                   <div>
//                     <Label required>Role</Label>
//                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
//                       {ROLES.map((r) => {
//                         const active = form.role === r.value;
//                         return (
//                           <button key={r.value} type="button"
//                             onClick={() => { setForm((f) => ({ ...f, role: r.value })); }}
//                             className={`chip-btn flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left ${active ? "active" : ""}`}
//                             style={{
//                               background: active ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
//                               borderColor: active ? "#2dd4bf" : "rgba(255,255,255,0.09)",
//                             }}>
//                             <span className="text-base">{r.icon}</span>
//                             <span className={`text-xs font-bold ${active ? "text-teal-300" : "text-slate-400"}`}>{r.label}</span>
//                           </button>
//                         );
//                       })}
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <SelectField label="Department" icon={MdBusiness}
//                       name="department_id" value={form.department_id} onChange={handleChange}
//                       disabled={!form.business_unit}>
//                       <option value="">{form.business_unit ? "Select Department" : "Select Business Unit First"}</option>
//                       {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
//                     </SelectField>

//                     <div>
//                       <Label>Reporting Manager {isManagerRole && <span className="ml-1 text-cyan-400 normal-case font-normal text-[10px]">(auto-assigned)</span>}</Label>
//                       {isManagerRole ? (
//                         <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium text-cyan-400"
//                           style={{ background: "rgba(6,182,212,0.08)", borderColor: "rgba(6,182,212,0.2)" }}>
//                           <MdPerson className="text-base" />
//                           {adminUser ? `${adminUser.full_name} (Admin)` : "Admin"}
//                         </div>
//                       ) : (
//                         <SelectField icon={MdPerson} name="manager_id" value={form.manager_id} onChange={handleChange}>
//                           <option value="">Select Manager</option>
//                           {filteredManagers.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.role.replace("_", " ")})</option>)}
//                         </SelectField>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* ── Section 4: Personal Details ── */}
//               <div className="p-5 sm:p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
//                 <SectionTitle num="4" title="Personal Details" />

//                 <div className="space-y-5">
//                   {/* Gender */}
//                   <div>
//                     <Label>Gender</Label>
//                     <div className="grid grid-cols-2 gap-2.5">
//                       {GENDERS.map((g) => {
//                         const active = form.gender === g.value;
//                         return (
//                           <button key={g.value} type="button"
//                             onClick={() => setForm((f) => ({ ...f, gender: g.value }))}
//                             className={`chip-btn flex items-center justify-center gap-2.5 py-3 rounded-xl border ${active ? "active" : ""}`}
//                             style={{
//                               background: active ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
//                               borderColor: active ? "#2dd4bf" : "rgba(255,255,255,0.09)",
//                             }}>
//                             <span className={`text-2xl font-bold transition-colors ${active ? "text-teal-300" : "text-slate-600"}`}
//                               style={{ fontFamily: "serif" }}>{g.symbol}</span>
//                             <span className={`text-sm font-bold ${active ? "text-teal-300" : "text-slate-400"}`}>{g.label}</span>
//                           </button>
//                         );
//                       })}
//                     </div>
//                   </div>

//                   {/* Marital Status */}
//                   <div>
//                     <Label>Marital Status</Label>
//                     <div className="grid grid-cols-2 gap-2.5">
//                       {MARITAL_STATUSES.map((ms) => {
//                         const active = form.marital_status === ms.value;
//                         return (
//                           <button key={ms.value} type="button"
//                             onClick={() => setForm((f) => ({ ...f, marital_status: ms.value, marriage_date: ms.value === "single" ? "" : f.marriage_date }))}
//                             className={`chip-btn flex items-center justify-center gap-2.5 py-3 rounded-xl border ${active ? "active" : ""}`}
//                             style={{
//                               background: active ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
//                               borderColor: active ? "#2dd4bf" : "rgba(255,255,255,0.09)",
//                             }}>
//                             <span className="text-lg">{ms.icon}</span>
//                             <span className={`text-sm font-bold ${active ? "text-teal-300" : "text-slate-400"}`}>{ms.label}</span>
//                           </button>
//                         );
//                       })}
//                     </div>
//                   </div>

//                   {/* Dates */}
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                     <div>
//                       <Label>Date of Birth</Label>
//                       <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange}
//                         className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border outline-none transition-all
//                           bg-slate-800/60 text-slate-300 border-slate-700/60 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/10" />
//                     </div>
//                     <div>
//                       <Label>Joining Date</Label>
//                       <input type="date" name="joining_date" value={form.joining_date} onChange={handleChange}
//                         className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border outline-none transition-all
//                           bg-slate-800/60 text-slate-300 border-slate-700/60 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/10" />
//                     </div>
//                   </div>

//                   <AnimatePresence>
//                     {form.marital_status === "married" && (
//                       <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
//                         <Label>Marriage Date</Label>
//                         <input type="date" name="marriage_date" value={form.marriage_date} onChange={handleChange}
//                           className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border outline-none transition-all
//                             bg-slate-800/60 text-slate-300 border-slate-700/60 focus:border-teal-500/70 focus:ring-2 focus:ring-teal-500/10" />
//                       </motion.div>
//                     )}
//                   </AnimatePresence>
//                 </div>
//               </div>

//               {/* ── Submit ── */}
//               <div className="space-y-3 pb-6">
//                 {otpVerified && (
//                   <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
//                     className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-teal-400"
//                     style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)" }}>
//                     <MdCheckCircle className="text-teal-400 flex-shrink-0" />
//                     Email verified successfully — you're good to go!
//                   </motion.div>
//                 )}

//                 <motion.button type="submit" disabled={loading}
//                   whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
//                   className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white flex items-center justify-center gap-2.5 disabled:opacity-60 transition-all"
//                   style={{ background: "linear-gradient(135deg,#0f766e 0%,#0891b2 50%,#0d9488 100%)", boxShadow: "0 8px 32px rgba(13,148,136,0.35)" }}>
//                   {loading
//                     ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
//                         className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Creating Account…</>
//                     : <><span className="syne">Create My Account</span> <MdArrowForward className="text-base" /></>}
//                 </motion.button>

//                 <p className="text-center text-xs text-slate-600">
//                   Already have an account?{" "}
//                   <Link to="/login" className="text-teal-400 font-bold hover:text-teal-300 transition-colors">Sign In</Link>
//                 </p>
//               </div>
//             </form>
//           </motion.div>
//         </div>
//       </div>

//       <CookieConsent />
//     </div>
//   );
// }