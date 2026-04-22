import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { applyLeave, getMyBalance, getHolidays, getMyEmergencyOverrideToday, submitWFH, getMySpecialCredits, getLeaves } from "../services/api";
import { format, differenceInCalendarDays } from "date-fns";
import { MdCalendarMonth, MdInfo, MdArrowBack, MdSend, MdWarning } from "react-icons/md";

const REQUEST_TYPES = [
  { value: "leave", label: "Leave Request" },
  { value: "weekend_work", label: "Weekend Work Approval Request" },
  { value: "wfh", label: "Work From Home Request" },
];

const ALL_LEAVE_CATEGORIES = [
  { value: "casual",    label: "Casual Leave",       color: "#3b82f6", desc: "12 days/year",             genders: null },
  { value: "sick",      label: "Sick Leave",          color: "#10b981", desc: "6 days/year",              genders: null },
  { value: "optional",  label: "Optional Leave",      color: "#f59e0b", desc: "2 days/year",              genders: null },
  { value: "maternity", label: "Maternity Leave",     color: "#ec4899", desc: "45 days",                  genders: ["female"] },
  { value: "paternity", label: "Paternity Leave",     color: "#8b5cf6", desc: "5 days",                   genders: ["male"] },
  { value: "compensate",label: "Compensate Leave",    color: "#f97316", desc: "Uses earned Special balance", genders: null },
  { value: "lop",       label: "Leave Without Pay",   color: "#6b7280", desc: "No balance deduction",     genders: null },
];

const ALL_BALANCE_OVERVIEW = [
  { key: "casual",    label: "Casual",    color: "#3b82f6", bg: "from-blue-50 to-blue-100",     genders: null },
  { key: "sick",      label: "Sick",      color: "#10b981", bg: "from-emerald-50 to-emerald-100", genders: null },
  { key: "optional",  label: "Optional",  color: "#f59e0b", bg: "from-amber-50 to-amber-100",   genders: null },
  { key: "special",   label: "Special",   color: "#f97316", bg: "from-orange-50 to-orange-100", genders: null },
  { key: "maternity", label: "Maternity", color: "#ec4899", bg: "from-pink-50 to-pink-100",     genders: ["female"] },
  { key: "paternity", label: "Paternity", color: "#8b5cf6", bg: "from-violet-50 to-violet-100", genders: ["male"] },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.07 } } };

function getAdvanceNoticeRequired(totalDays) {
  if (totalDays <= 1) return 7;
  return 15;
}

function countWeekendDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let current = new Date(start);
  let count = 0;
  let hasWeekday = false;

  while (current <= end) {
    const day = current.getDay();
    if (day === 0 || day === 6) count += 1;
    else hasWeekday = true;
    current.setDate(current.getDate() + 1);
  }

  return { count, hasWeekday };
}

export default function ApplyLeavePage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const userGender = user?.gender || null;

  // Filter leave categories and balance cards based on gender
  const LEAVE_CATEGORIES = ALL_LEAVE_CATEGORIES.filter(
    (c) => !c.genders || !userGender || c.genders.includes(userGender)
  );
  const BALANCE_OVERVIEW = ALL_BALANCE_OVERVIEW.filter(
    (b) => !b.genders || !userGender || b.genders.includes(userGender)
  );

  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [usedOptionalDates, setUsedOptionalDates] = useState(new Set());
  const [specialCredits, setSpecialCredits] = useState([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [advanceWarning, setAdvanceWarning] = useState("");
  const [weekendWarning, setWeekendWarning] = useState("");
  const [managerOverrideEnabled, setManagerOverrideEnabled] = useState(false);
  const [form, setForm] = useState({
    request_type: "leave",
    leave_type: "casual",
    requested_days: 1,
    start_date: "",
    end_date: "",
    reason: "",
    half_day: false,
    half_day_type: "morning",
    is_retroactive: false,
    urgent: false,
  });

  useEffect(() => {
    getMyBalance().then((r) => setBalance(r.data)).catch(() => {});
    getHolidays(new Date().getFullYear()).then((r) => setHolidays(r.data)).catch(() => {});
    getMyEmergencyOverrideToday().then((r) => setManagerOverrideEnabled(!!r.data?.enabled)).catch(() => {});
    getMySpecialCredits().then((r) => setSpecialCredits(r.data)).catch(() => {});
    // Fetch existing optional leaves to disable already-used holiday dates
    getLeaves({ leave_type: "optional", year: new Date().getFullYear() })
      .then((r) => {
        const used = new Set(
          (r.data || [])
            .filter((l) => ["pending", "approved"].includes(l.status))
            .map((l) => l.start_date)
        );
        setUsedOptionalDates(used);
      })
      .catch(() => {});
  }, []);

  const isWeekendRequest = form.request_type === "weekend_work";
  const isWFH = form.request_type === "wfh";
  const isSick = form.leave_type === "sick";
  const isCasual = form.leave_type === "casual";
  const isLOP = form.leave_type === "lop";
  const isCompensate = form.leave_type === "compensate";
  const isOptionalLeave = form.leave_type === "optional";
  const isCalendarLeave = form.leave_type === "maternity" || form.leave_type === "paternity";
  const optionalHolidays = holidays.filter((h) => h.holiday_type === "optional");
  const selectedCategory = LEAVE_CATEGORIES.find((t) => t.value === form.leave_type);
  // Only credits earned >= 15 days ago count as eligible for compensate leave
  const eligibleSpecialDays = specialCredits.filter((c) => c.is_eligible).reduce((s, c) => s + c.days, 0);
  const coolingCredits = specialCredits.filter((c) => !c.is_eligible);
  const specialAvailable = Math.max(0, eligibleSpecialDays - (balance?.special_used || 0));

  useEffect(() => {
    if (!form.start_date || !form.end_date) {
      setWorkingDays(0);
      setAdvanceWarning("");
      setWeekendWarning("");
      return;
    }

    // Optional leave is always exactly 1 day (specific holiday)
    if (isOptionalLeave) {
      setWorkingDays(form.half_day ? 0.5 : 1);
      setAdvanceWarning("");
      setWeekendWarning("");
      return;
    }

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    if (end < start) {
      setWorkingDays(0);
      setAdvanceWarning("");
      setWeekendWarning("");
      return;
    }

    if (isWeekendRequest) {
      const { count, hasWeekday } = countWeekendDays(form.start_date, form.end_date);
      const days = form.half_day ? 0.5 : count;
      setWorkingDays(days);
      setAdvanceWarning("");
      if (hasWeekday) {
        setWeekendWarning("Weekend work request accepts only Saturday/Sunday dates.");
      } else if (count <= 0) {
        setWeekendWarning("Select at least one Saturday or Sunday.");
      } else {
        setWeekendWarning("");
      }
      return;
    }

    let count;
    if (isCalendarLeave) {
      count = differenceInCalendarDays(end, start) + 1;
    } else {
      const holidayDates = new Set(
        holidays.filter((h) => h.holiday_type === "mandatory").map((h) => h.date)
      );
      count = 0;
      let cur = new Date(start);
      while (cur <= end) {
        const ds = format(cur, "yyyy-MM-dd");
        const day = cur.getDay();
        const isSun = day === 0;
        const isSat = day === 6;
        // 2nd and 4th Saturdays are working days
        const satNum = Math.ceil(cur.getDate() / 7);
        const isWorkingSat = isSat && satNum % 2 === 0;
        if (!isSun && (!isSat || isWorkingSat) && !holidayDates.has(ds)) count++;
        cur.setDate(cur.getDate() + 1);
      }
    }
    const days = form.half_day ? 0.5 : count;
    setWorkingDays(days);
    setWeekendWarning("");

    if (isCasual && !managerOverrideEnabled) {
      const daysUntilStart = differenceInCalendarDays(start, new Date());
      const noticeDays = form.half_day ? 1 : (days || Number(form.requested_days) || 1);
      const required = getAdvanceNoticeRequired(noticeDays);
      // Past dates are always allowed; only near-future dates need advance notice
      if (daysUntilStart < 0) {
        setAdvanceWarning("");
      } else if (daysUntilStart < required) {
        if (form.urgent && daysUntilStart >= 1) {
          setAdvanceWarning(
            `Applying with short notice (${daysUntilStart} day(s) before). Marked urgent for manager override.`
          );
        } else {
          setAdvanceWarning(
            `advance notice required — ${noticeDays} day(s) leave needs ${required} days advance notice. You have only ${daysUntilStart} day(s). Ask your manager to enable override, or tick "Urgent".`
          );
        }
      } else {
        setAdvanceWarning("");
      }
    } else {
      setAdvanceWarning("");
    }
  }, [
    form.start_date,
    form.end_date,
    form.half_day,
    form.leave_type,
    form.requested_days,
    form.urgent,
    form.is_retroactive,
    form.request_type,
    holidays,
    isWeekendRequest,
    isOptionalLeave,
    isCasual,
    managerOverrideEnabled,
  ]);

  useEffect(() => {
    if (isWeekendRequest) {
      setForm((f) => ({
        ...f,
        half_day: false,
        is_retroactive: false,
        urgent: false,
      }));
      return;
    }

    if (form.leave_type !== "sick") {
      setForm((f) => ({ ...f, is_retroactive: false }));
    }

    // Clear dates when switching leave type so stale dates don't carry over
    setForm((f) => ({ ...f, start_date: "", end_date: "" }));
    setWorkingDays(0);
  }, [form.leave_type, form.request_type, isWeekendRequest]);

  useEffect(() => {
    if (!isWeekendRequest && form.leave_type === "compensate" && specialAvailable < 1) {
      setForm((f) => ({ ...f, leave_type: "casual" }));
    }
  }, [isWeekendRequest, form.leave_type, specialAvailable]);

  function getAvailable(type) {
    if (!balance) return 0;
    const map = {
      casual: balance.casual_total - balance.casual_used,
      sick: balance.sick_total - balance.sick_used,
      optional: balance.optional_total - balance.optional_used,
      maternity: balance.maternity_total - balance.maternity_used,
      paternity: balance.paternity_total - balance.paternity_used,
      compensate: balance.special_total - balance.special_used,
      lop: 999,
    };
    return map[type] ?? 0;
  }

  const available = getAvailable(form.leave_type);
  const isInsufficient = !isWeekendRequest && !isLOP && workingDays > 0 && workingDays > available;

  function getMinStartDate() {
    if (isWeekendRequest || isSick || managerOverrideEnabled) return undefined;
    if (isCasual) {
      const noticeDays = form.half_day ? 7 : getAdvanceNoticeRequired(form.requested_days);
      const min = new Date();
      min.setDate(min.getDate() + noticeDays);
      return format(min, "yyyy-MM-dd");
    }
    return undefined;
  }

  const minStartDate = getMinStartDate();


  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      toast.error("Please select dates");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    // WFH request — separate API
    if (isWFH) {
      setLoading(true);
      try {
        await submitWFH({ start_date: form.start_date, end_date: form.end_date, reason: form.reason });
        toast.success("Work from home request submitted to manager.");
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to submit WFH request");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isCasual && !form.half_day && Number(form.requested_days || 0) !== Number(workingDays || 0)) {
      toast.error(`Selected range has ${workingDays} working day(s). It must match requested ${form.requested_days} day(s).`);
      return;
    }
    if (!isWeekendRequest && advanceWarning.startsWith("advance notice required")) {
      toast.error("Cannot apply — advance notice period not met. Ask your manager to enable override.");
      return;
    }
    if (isWeekendRequest && weekendWarning) {
      toast.error(weekendWarning);
      return;
    }

    setLoading(true);
    try {
      const apiLeaveType = isWeekendRequest
        ? "special"
        : isCompensate
          ? "special"
          : form.leave_type;
      const payload = {
        leave_type: apiLeaveType,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: isWeekendRequest ? `Weekend work request: ${form.reason}` : form.reason,
        half_day: isWeekendRequest ? false : form.half_day,
        half_day_type: !isWeekendRequest && form.half_day ? form.half_day_type : undefined,
        is_retroactive: !isWeekendRequest ? (form.leave_type === "sick" || managerOverrideEnabled) : false,
        urgent: !isWeekendRequest && form.leave_type === "casual" ? form.urgent : false,
      };
      await applyLeave(payload);
      toast.success(
        isWeekendRequest
          ? "Weekend work request submitted to manager."
          : "Leave applied. Manager will be notified."
      );
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-5 pb-8">
      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/dashboard")}
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-700 shadow-sm"
        >
          <MdArrowBack />
        </motion.button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {isWFH ? "Work From Home Request" : "Apply for Leave"}
          </h1>
          <p className="text-gray-400 text-sm">Submit a request for manager approval</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              1
            </span>
            Request Details
          </h3>

          {balance && !isWFH && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BALANCE_OVERVIEW.map((b) => {
                const used = balance[`${b.key}_used`] || 0;
                const total = balance[`${b.key}_total`] || 0;
                const availableDays = Math.max(0, total - used);
                return (
                  <div key={b.key} className={`rounded-xl border border-white p-3 bg-gradient-to-br ${b.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">{b.label}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 text-gray-500">{used}/{total} used</span>
                    </div>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: b.color }}>{availableDays}</p>
                    <p className="text-xs text-gray-500">days available</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Request Type <span className="text-red-500">*</span></label>
              <select
                value={form.request_type}
                onChange={(e) => setForm((f) => ({ ...f, request_type: e.target.value }))}
                className="input-field"
              >
                {REQUEST_TYPES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {!isWeekendRequest && !isWFH && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Leave Category <span className="text-red-500">*</span></label>
                <select
                  value={form.leave_type}
                  onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                  className="input-field"
                >
                  {LEAVE_CATEGORIES.map((t) => {
                    const disabled = t.value === "compensate" && specialAvailable < 1;
                    const nextAvailable = disabled && coolingCredits.length > 0
                      ? new Date(coolingCredits[0].available_from).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : null;
                    return (
                      <option key={t.value} value={t.value} disabled={disabled}>
                        {disabled
                          ? nextAvailable
                            ? `${t.label} — available from ${nextAvailable}`
                            : `${t.label} — no special balance`
                          : t.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {!isWeekendRequest && !isWFH && selectedCategory && (
            <div
              className="rounded-xl px-4 py-3 text-sm border"
              style={{ background: `${selectedCategory.color}10`, color: selectedCategory.color, borderColor: `${selectedCategory.color}30` }}
            >
              <MdInfo className="inline-block mr-2 text-base align-text-bottom" />
              {isLOP
                ? "No balance deducted. Salary will be adjusted for these days."
                : isCompensate
                  ? `${specialAvailable} day(s) eligible for compensate leave.`
                  : `${available} day(s) available. ${selectedCategory.desc}.`}
            </div>
          )}

          {isCompensate && coolingCredits.length > 0 && (
            <div className="rounded-xl px-4 py-3 text-sm border bg-amber-50 border-amber-200 space-y-2">
              <p className="font-semibold text-amber-700 flex items-center gap-2">
                <MdWarning className="text-base flex-shrink-0" />
                Special leave under 15-day cooling period — not yet available:
              </p>
              {coolingCredits.map((c) => (
                <div key={c.id} className="ml-6 text-amber-700 bg-amber-100/60 rounded-lg px-3 py-2 space-y-0.5">
                  <p><strong>{c.days} day(s)</strong> earned for working on{" "}
                    <strong>{new Date(c.work_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                  </p>
                  <p className="text-amber-600 text-xs">
                    Approved on {new Date(c.earned_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}Available to use from{" "}
                    <strong>{new Date(c.available_from).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}

          {isWeekendRequest && (
            <div className="rounded-xl px-4 py-3 text-sm border bg-orange-50 text-orange-700 border-orange-200">
              <MdInfo className="inline-block mr-2 text-base align-text-bottom" />
             Employees who work on weekends or holidays can apply for Special  Leave, subject to manager approval. Once approved, the special leave balance will be credited and can be availed after 15 days from the date earned.

            </div>
          )}

          {isWFH && (
            <div className="rounded-xl px-4 py-3 text-sm border bg-blue-50 text-blue-700 border-blue-200">
              <MdInfo className="inline-block mr-2 text-base align-text-bottom" />
              Work from home requests are sent to your manager for approval. Select the date(s) and provide a reason below.
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              2
            </span>
            Select Dates & Options
          </h3>

          {!isWeekendRequest && !isWFH && isSick && (
            <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer mb-3 transition-all"
              style={{ borderColor: "#10b981", background: "#f0fdf4" }}>
              <input
                type="checkbox"
                checked={true}
                readOnly
              />
              <div>
                <span className="font-medium text-gray-700">Backdated Sick Leave Enabled</span>
                <p className="text-xs text-gray-400 mt-0.5">You can select yesterday/previous dates for sick leave</p>
              </div>
            </label>
          )}

          {!isWeekendRequest && !isWFH && managerOverrideEnabled && (
            <div className="mb-3 p-3.5 rounded-xl border border-red-200 bg-red-50">
              <span className="font-medium text-red-700">Emergency Override Enabled By Manager</span>
              <p className="text-xs text-red-600 mt-0.5">
                You can apply leave for previous dates today. This override expires after today.
              </p>
            </div>
          )}

          {!isWeekendRequest && !isWFH && isCasual && !form.half_day && (
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Number of Leave Days <span className="text-red-500">*</span></label>
              <select
                value={form.requested_days}
                onChange={(e) => setForm((f) => ({ ...f, requested_days: Number(e.target.value) }))}
                className="input-field"
              >
                {[1,2,3,4,5,6,7].map((d) => (
                  <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
                ))}
                <option value={8}>Above 7 days</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                1 day leave requires 7 days prior notice. 2 or more days require 15 days prior notice.
              </p>
            </div>
          )}


          {!isWeekendRequest && !isWFH && (
            <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer mb-4 transition-all"
              style={form.half_day ? { borderColor: "#3b82f6", background: "#eff6ff" } : { borderColor: "#e5e7eb" }}>
              <input
                type="checkbox"
                checked={form.half_day}
                onChange={(e) => setForm((f) => ({ ...f, half_day: e.target.checked }))}
              />
              <span className="font-medium text-gray-700">Half Day Leave</span>
              <AnimatePresence>
                {form.half_day && (
                  <motion.select
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    value={form.half_day_type}
                    onChange={(e) => setForm((f) => ({ ...f, half_day_type: e.target.value }))}
                    className="ml-auto input-field w-36 text-sm py-1.5"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </motion.select>
                )}
              </AnimatePresence>
            </label>
          )}

          {/* Optional leave: show holiday picker instead of free date inputs */}
          {isOptionalLeave ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Select Optional Holiday <span className="text-red-500">*</span>
              </label>
              {/* Quota exhausted banner */}
              {available <= 0 && (
                <div className="mb-3 flex items-start gap-3 rounded-xl px-4 py-3.5 bg-red-50 border border-red-200">
                  <MdWarning className="text-red-500 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Optional Leave Limit Reached</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      You have already used {balance?.optional_total ?? 2} optional leaves for the year {new Date().getFullYear()}.
                      No more optional leaves can be applied this year.
                    </p>
                  </div>
                </div>
              )}
              {optionalHolidays.length === 0 ? (
                <div className="rounded-xl px-4 py-4 bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  No optional holidays declared for {new Date().getFullYear()}. Contact HR to add optional holidays.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {optionalHolidays.map((h) => {
                      const d = new Date(h.date + "T00:00:00");
                      const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
                      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
                      const isSelected = form.start_date === h.date;
                      const isUsed = usedOptionalDates.has(h.date);
                      const quotaFull = available <= 0 && !isUsed;
                      const isDisabled = isUsed || quotaFull;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            setForm((f) => ({ ...f, start_date: h.date, end_date: h.date }));
                            setWorkingDays(form.half_day ? 0.5 : 1);
                          }}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                            isUsed
                              ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                              : quotaFull
                                ? "border-red-100 bg-red-50/40 opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "border-amber-400 bg-amber-50"
                                  : "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm ${
                            isUsed || quotaFull ? "bg-gray-200 text-gray-400" : isSelected ? "bg-amber-400 text-white" : "bg-amber-100 text-amber-700"
                          }`}>
                            <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
                            <span className="text-[10px] opacity-80">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold text-sm truncate ${isDisabled ? "text-gray-400 line-through" : isSelected ? "text-amber-800" : "text-gray-800"}`}>{h.name}</p>
                            <p className="text-xs text-gray-400">{dayName} · {dateStr}</p>
                            {isUsed && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-300 text-gray-600">Already Used</span>
                            )}
                            {quotaFull && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-200 text-red-600">Quota Full</span>
                            )}
                            {isSelected && !isDisabled && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-white">Selected</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {form.start_date && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⭐ You have selected: <strong>{optionalHolidays.find((h) => h.date === form.start_date)?.name}</strong> on{" "}
                      {new Date(form.start_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {!isWeekendRequest && !isWFH && form.half_day ? "Date" : "Start Date"} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.start_date}
                min={isWFH ? undefined : minStartDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    start_date: e.target.value,
                    end_date: !isWeekendRequest && !isWFH && f.half_day ? e.target.value : f.end_date,
                  }))
                }
                className="input-field"
                required
              />
            </div>

            {!((!isWeekendRequest && !isWFH) && form.half_day) && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.end_date}
                  min={form.start_date || (isWFH ? undefined : minStartDate)}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            )}
          </div>
          )}

          <AnimatePresence>
            {workingDays > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                  isWFH ? "bg-blue-50 text-blue-700" : isInsufficient ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                }`}
              >
                <MdCalendarMonth className="text-lg" />
                <span>
                  <strong>{workingDays}</strong> {isWFH ? "working day(s) requested for WFH" : isWeekendRequest ? "weekend day(s) requested for credit" : isCalendarLeave ? "calendar day(s) requested (weekends & holidays included)" : "working day(s) requested"}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {advanceWarning && !isWeekendRequest && !isWFH && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                  advanceWarning.startsWith("advance notice required")
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}
              >
                <MdWarning className="text-lg flex-shrink-0 mt-0.5" />
                <span>{advanceWarning}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {weekendWarning && isWeekendRequest && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-600 border border-red-100"
              >
                <MdWarning className="text-lg flex-shrink-0 mt-0.5" />
                <span>{weekendWarning}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              3
            </span>
            Reason
          </h3>
          <textarea
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            rows={4}
            required
            placeholder={
              isWeekendRequest
                ? "Mention weekend date(s), project/task, and effort details..."
                : isLOP
                  ? "Provide reason for leave without pay..."
                  : isSick && form.is_retroactive
                    ? "Describe the illness and dates you were sick..."
                    : "Provide a clear reason for this request..."
            }
            className="input-field resize-none text-sm"
          />
          <p className="text-xs text-gray-400 mt-1.5">{form.reason.length} characters</p>
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-3">
          <button type="button" onClick={() => navigate("/dashboard")} className="btn-secondary flex-1 py-3">
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={loading || (!isWFH && isInsufficient) || (!!weekendWarning && isWeekendRequest) || (!isWeekendRequest && !isWFH && isCompensate && specialAvailable < 1) || (!isWFH && advanceWarning.startsWith("advance notice required"))}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-shadow"
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Submitting...
              </>
            ) : (
              <>
                <MdSend /> Submit Request
              </>
            )}
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
}
