import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAnniversaries, getEmployeeDirectory } from "../services/api";
import toast from "react-hot-toast";
import UserAvatar from "../components/common/UserAvatar";
import {
  MdCake, MdWork, MdFavorite, MdFilterList, MdStar, MdCalendarMonth, MdDownload
} from "react-icons/md";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const TYPE_CONFIG = {
  birthday:            { icon: MdCake,     label: "Birthday",            bg: "bg-rose-100",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-400",    cardBg: "bg-rose-50",    gradient: "from-rose-500 to-pink-500" },
  work_anniversary:    { icon: MdWork,     label: "Work Anniversary",    bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400",    cardBg: "bg-blue-50",    gradient: "from-blue-500 to-indigo-500" },
  marriage_anniversary:{ icon: MdFavorite, label: "Marriage Anniversary",bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-200",  dot: "bg-purple-400",  cardBg: "bg-purple-50",  gradient: "from-purple-500 to-violet-500" },
};

const FILTER_OPTIONS = [
  { value: "all",                label: "All",         shortLabel: "All",      icon: MdFilterList },
  { value: "birthday",           label: "Birthdays",   shortLabel: "Birthday", icon: MdCake },
  { value: "work_anniversary",   label: "Work Ann.",   shortLabel: "Work",     icon: MdWork },
  { value: "marriage_anniversary",label: "Marriage",   shortLabel: "Marriage", icon: MdFavorite },
];

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger = { show: { transition: { staggerChildren: 0.05 } } };

const ROLE_LABELS = {
  employee: "Employee", team_lead: "Team Lead", manager: "Manager",
  hr: "HR", main_manager: "Main Manager", admin: "Admin",
};

function fmtDate(d) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[parseInt(m) - 1]} ${y}`;
}

function generateAndPrint(data) {
  const { departments, generated_on, total_employees } = data;

  let globalIdx = 1;

  const deptSections = departments.map(({ department, employees }) => {
    const rows = employees.map((emp) => {
      const isMarried = emp.marital_status === "married";
      const isSingle  = emp.marital_status === "single";
      const maritalCell = isMarried
        ? `<span style="color:#7c3aed;font-weight:700">Married</span><br>` +
          (emp.marriage_date
            ? `<span style="color:#7c3aed;font-size:10.5px;font-weight:600">🗓 ${fmtDate(emp.marriage_date)}</span>`
            : `<span style="color:#f59e0b;font-size:10px;font-style:italic">Date not added</span>`)
        : isSingle
        ? `<span style="color:#0891b2;font-weight:600">Single</span>`
        : `<span style="color:#cbd5e1">—</span>`;

      const row = `
        <tr class="data-row">
          <td class="td-num">${globalIdx++}</td>
          <td class="td-name">${emp.name}</td>
          <td class="td-role">${ROLE_LABELS[emp.role] || emp.role}</td>
          <td class="td">${emp.date_of_birth ? fmtDate(emp.date_of_birth) : '<span style="color:#cbd5e1">—</span>'}</td>
          <td class="td">${emp.joining_date ? fmtDate(emp.joining_date) : '<span style="color:#cbd5e1">—</span>'}</td>
          <td class="td-exp">${emp.experience !== "—" ? emp.experience : '<span style="color:#cbd5e1">—</span>'}</td>
          <td class="td">${maritalCell}</td>
        </tr>`;
      return row;
    }).join("");

    return `
      <div class="dept-block">
        <div class="dept-header">
          <span class="dept-name">${department}</span>
          <span class="dept-count">${employees.length} employee${employees.length !== 1 ? "s" : ""}</span>
        </div>
        <table class="emp-table">
          <colgroup>
            <col style="width:32px">
            <col style="width:18%">
            <col style="width:11%">
            <col style="width:14%">
            <col style="width:14%">
            <col style="width:10%">
            <col style="width:19%">
          </colgroup>
          <thead>
            <tr class="th-row">
              <th class="th th-c">#</th>
              <th class="th">Employee Name</th>
              <th class="th">Role</th>
              <th class="th">Date of Birth</th>
              <th class="th">Date of Joining</th>
              <th class="th">Experience</th>
              <th class="th">Marital Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Employee Directory — MEPstra</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1e293b;font-size:12px}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      @page{size:A4 landscape;margin:12mm 14mm}
      .dept-block{page-break-inside:avoid}
    }
    .page{max-width:270mm;margin:0 auto;padding:18px}

    /* ── Header ── */
    .report-header{display:flex;justify-content:space-between;align-items:center;
      padding-bottom:12px;margin-bottom:16px;border-bottom:3px solid #1e293b}
    .brand{font-size:20px;font-weight:800;color:#1e293b;letter-spacing:-0.5px}
    .brand-sub{font-size:11px;color:#64748b;margin-top:3px}
    .meta{text-align:right}
    .meta-date{font-size:11px;color:#64748b}
    .meta-val{font-size:13px;font-weight:700;color:#1e293b}
    .meta-pill{display:inline-block;margin-top:5px;background:#0f172a;color:#fff;
      padding:3px 12px;border-radius:20px;font-size:10.5px;font-weight:600}

    /* ── Department block ── */
    .dept-block{margin-bottom:18px}
    .dept-header{display:flex;justify-content:space-between;align-items:center;
      background:linear-gradient(90deg,#1e293b 0%,#334155 100%);
      color:#fff;padding:6px 12px;border-radius:6px 6px 0 0}
    .dept-name{font-size:12.5px;font-weight:700;letter-spacing:0.2px}
    .dept-count{font-size:10.5px;opacity:0.75;font-style:italic}

    /* ── Table ── */
    .emp-table{width:100%;border-collapse:collapse;
      border:1px solid #e2e8f0;border-top:none;border-radius:0 0 6px 6px}
    .th-row{background:#f1f5f9}
    .th{padding:6px 8px;font-size:10.5px;font-weight:700;color:#475569;
      text-align:left;text-transform:uppercase;letter-spacing:0.4px;
      border-bottom:1.5px solid #cbd5e1}
    .th-c{text-align:center}
    .data-row:nth-child(even){background:#f8fafc}
    .data-row:nth-child(odd){background:#ffffff}
    .data-row:last-child td{border-bottom:none}
    .td-num{padding:6px 8px;text-align:center;color:#94a3b8;font-size:11px;
      border-bottom:1px solid #f1f5f9}
    .td-name{padding:6px 8px;font-weight:600;font-size:12px;color:#0f172a;
      border-bottom:1px solid #f1f5f9}
    .td-role{padding:6px 8px;font-size:11px;color:#64748b;font-style:italic;
      border-bottom:1px solid #f1f5f9}
    .td{padding:6px 8px;font-size:11px;color:#334155;border-bottom:1px solid #f1f5f9;line-height:1.5}
    .td-exp{padding:6px 8px;font-size:11px;font-weight:700;color:#0369a1;
      border-bottom:1px solid #f1f5f9}

    /* ── Footer ── */
    .footer{margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;
      display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8}
  </style>
</head>
<body>
<div class="page">

  <div class="report-header">
    <div>
      <div class="brand">MEPstra Leave Portal</div>
      <div class="brand-sub">Employee Directory Report &nbsp;·&nbsp; Department Wise</div>
    </div>
    <div class="meta">
      <div class="meta-date">Generated on</div>
      <div class="meta-val">${fmtDate(generated_on)}</div>
      <div class="meta-pill">${total_employees} Employees &nbsp;·&nbsp; ${departments.length} Departments</div>
    </div>
  </div>

  ${deptSections}

  <div class="footer">
    <span>Confidential &nbsp;—&nbsp; For HR use only</span>
    <span>MEPstra Leave Portal &nbsp;·&nbsp; ${fmtDate(generated_on)}</span>
  </div>

</div>
<script>window.onload=()=>{ setTimeout(()=>window.print(), 300); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

function DaysChip({ days }) {
  if (days === 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-white animate-pulse">🎉 Today!</span>;
  if (days <= 7)
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">In {days}d</span>;
  if (days <= 30)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">In {days}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">{days}d away</span>;
}

function EventCard({ event }) {
  const cfg = TYPE_CONFIG[event.type];
  const Icon = cfg.icon;
  return (
    <motion.div variants={fadeUp}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${cfg.border} ${cfg.cardBg} hover:shadow-sm transition-shadow`}>
      <UserAvatar name={event.name} profileImage={event.profile_image} size="sm" rounded="full" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{event.name}</p>
        <p className="text-xs text-gray-400 truncate">{event.department}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {MONTHS_SHORT[event.month - 1]} {event.day}
          {event.original_year ? ` · ${event.original_year}` : ""}
        </p>
        {event.year_info && (
          <p className={`text-xs font-semibold mt-0.5 ${cfg.text}`}>{event.year_info}</p>
        )}
        {/* On mobile show chips inline below name */}
        <div className="flex items-center gap-1.5 mt-1 sm:hidden">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
            <Icon size={10} /> {cfg.label}
          </span>
          <DaysChip days={event.days_until} />
        </div>
      </div>
      {/* On sm+ show chips on right */}
      <div className="hidden sm:flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
          <Icon size={11} /> {cfg.label}
        </span>
        <DaysChip days={event.days_until} />
      </div>
    </motion.div>
  );
}

export default function AnniversariesPage() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [typeFilter, setTypeFilter] = useState("all");
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await getEmployeeDirectory();
      generateAndPrint(res.data);
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    getAnniversaries()
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load anniversaries"))
      .finally(() => setLoading(false));
  }, []);

  const monthData = data?.months?.find((m) => m.month === activeMonth);
  const rawEvents = monthData?.events || [];
  const events = typeFilter === "all" ? rawEvents : rawEvents.filter((e) => e.type === typeFilter);

  const upcoming = (data?.upcoming || []).filter(
    (e) => typeFilter === "all" || e.type === typeFilter
  );

  const totalByType = {
    birthday: rawEvents.filter((e) => e.type === "birthday").length,
    work_anniversary: rawEvents.filter((e) => e.type === "work_anniversary").length,
    marriage_anniversary: rawEvents.filter((e) => e.type === "marriage_anniversary").length,
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-5">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <MdStar className="text-amber-400" /> Anniversaries & Birthdays
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Employee celebrations across the organisation</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
        >
          <MdDownload size={15} />
          {downloading ? "Generating…" : "Download Report"}
        </button>
        {/* Type filter */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(({ value, label, shortLabel, icon: Icon }) => (
            <button key={value} onClick={() => setTypeFilter(value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                typeFilter === value
                  ? "bg-gray-900 text-white border-gray-900 shadow"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </button>
          ))}
        </div>
        </div>
      </motion.div>

      {/* Upcoming banner (next 14 days) */}
      {!loading && upcoming.length > 0 && (
        <motion.div variants={fadeUp} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
            <MdStar className="text-amber-500" /> Upcoming in next 14 days ({upcoming.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcoming.map((e, i) => {
              const cfg = TYPE_CONFIG[e.type];
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2 border border-amber-100 shadow-sm">
                  <UserAvatar name={e.name} profileImage={e.profile_image} size="sm" rounded="full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{e.name}</p>
                    <p className={`text-xs ${cfg.text} flex items-center gap-1`}>
                      <Icon size={11} /> {cfg.label}
                    </p>
                  </div>
                  <DaysChip days={e.days_until} />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Month tabs */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {MONTHS_SHORT.map((m, i) => {
            const mNum = i + 1;
            const monthEvents = (data?.months?.find((x) => x.month === mNum)?.events || [])
              .filter((e) => typeFilter === "all" || e.type === typeFilter);
            const isToday = mNum === currentMonth;
            const isActive = mNum === activeMonth;
            const hasToday = monthEvents.some((e) => e.days_until === 0);
            return (
              <button key={mNum} onClick={() => setActiveMonth(mNum)}
                className={`relative flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all min-w-[52px] ${
                  isActive
                    ? "bg-gray-900 text-white shadow"
                    : isToday
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "text-gray-500 hover:bg-gray-50"
                }`}>
                {m}
                {monthEvents.length > 0 && (
                  <span className={`mt-0.5 text-[10px] font-bold ${isActive ? "text-white/70" : "text-gray-400"}`}>
                    {monthEvents.length}
                  </span>
                )}
                {hasToday && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Month content */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Month header */}
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MdCalendarMonth className="text-indigo-500" />
              {MONTHS[activeMonth - 1]}
              {activeMonth === currentMonth && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Current Month</span>
              )}
            </h2>
            {events.length > 0 && (
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {totalByType.birthday > 0 && typeFilter !== "work_anniversary" && typeFilter !== "marriage_anniversary" && (
                  <span className="text-xs text-rose-600 font-medium flex items-center gap-1"><MdCake size={12} /> {totalByType.birthday} Birthday{totalByType.birthday !== 1 ? "s" : ""}</span>
                )}
                {totalByType.work_anniversary > 0 && typeFilter !== "birthday" && typeFilter !== "marriage_anniversary" && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><MdWork size={12} /> {totalByType.work_anniversary} Work Ann.</span>
                )}
                {totalByType.marriage_anniversary > 0 && typeFilter !== "birthday" && typeFilter !== "work_anniversary" && (
                  <span className="text-xs text-purple-600 font-medium flex items-center gap-1"><MdFavorite size={12} /> {totalByType.marriage_anniversary} Marriage Ann.</span>
                )}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-300">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full mb-3" />
            <p className="text-sm">Loading celebrations…</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-400">
            <MdCalendarMonth className="text-5xl mb-3 text-gray-200" />
            <p className="font-medium text-sm">No celebrations in {MONTHS[activeMonth - 1]}</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={stagger}
            className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {events.map((event, i) => (
              <EventCard key={`${event.id}-${event.type}`} event={event} />
            ))}
          </motion.div>
        )}
      </motion.div>

    </motion.div>
  );
}
