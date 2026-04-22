import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getLeaves, getTeamLeaves, getHolidays, getMyWFH, getAllWFH } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdCalendarMonth, MdCelebration, MdHomeWork } from "react-icons/md";

const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#10b981",
  approved_by_manager: "#3b82f6",
  rejected: "#ef4444",
  cancelled: "#9ca3af",
};

const HOLIDAY_COLORS = { mandatory: "#6366f1", optional: "#ec4899" };
const WEEKEND_WORK_COLOR = "#f97316";
const WEEKEND_WORK_PREFIX = "weekend work request:";

function isWeekendWorkRequest(leave) {
  return (
    leave?.leave_type === "special" &&
    (leave?.reason || "").toLowerCase().startsWith(WEEKEND_WORK_PREFIX)
  );
}

function fmtLeaveType(type) {
  if (!type) return "";
  if (type === "lop") return "LOP";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getLeaveDisplayType(leave) {
  if (!leave) return "";
  if (isWeekendWorkRequest(leave)) return "Weekend Work Request";
  if (leave.leave_type === "special") return "Compensate Leave";
  return fmtLeaveType(leave.leave_type);
}

const WFH_COLOR = "#0284c7";

const LEGEND = [
  { label: "Approved Leave", color: "#10b981" },
  { label: "Pending Leave", color: "#f59e0b" },
  { label: "Manager Approved", color: "#3b82f6" },
  { label: "Weekend Work Request", color: WEEKEND_WORK_COLOR },
  { label: "Work From Home", color: WFH_COLOR },
  { label: "Mandatory Holiday", color: "#6366f1" },
  { label: "Optional Holiday", color: "#ec4899" },
];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function CalendarPage() {
  const { user } = useSelector((s) => s.auth);
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);

  const isTeamView = ["manager", "hr"].includes(user?.role);
  const isAdminView = ["admin", "main_manager"].includes(user?.role);

  useEffect(() => {
    const year = new Date().getFullYear();
    const leaveFetch = isTeamView ? getTeamLeaves({ year }) : getLeaves({ year });
    const wfhFetch = (isTeamView || isAdminView) ? getAllWFH() : getMyWFH();
    Promise.all([leaveFetch, getHolidays(year), wfhFetch]).then(([leavesRes, holidaysRes, wfhRes]) => {
      const leaveEvents = leavesRes.data.map((l) => ({
        id: `leave-${l.id}`,
        title: `${l.user?.full_name || "You"} - ${getLeaveDisplayType(l)}`,
        start: l.start_date,
        end: l.end_date,
        backgroundColor: isWeekendWorkRequest(l) ? WEEKEND_WORK_COLOR : (STATUS_COLORS[l.status] || "#6b7280"),
        borderColor: isWeekendWorkRequest(l) ? WEEKEND_WORK_COLOR : (STATUS_COLORS[l.status] || "#6b7280"),
        textColor: "#fff",
        extendedProps: { type: "leave", data: l },
      }));

      const holidayEvents = holidaysRes.data.map((h) => ({
        id: `holiday-${h.id}`,
        title: h.name,
        start: h.date,
        backgroundColor: HOLIDAY_COLORS[h.holiday_type] || "#6366f1",
        borderColor: HOLIDAY_COLORS[h.holiday_type] || "#6366f1",
        textColor: "#fff",
        extendedProps: { type: "holiday", data: h },
      }));

      const wfhEvents = (wfhRes.data || [])
        .filter((w) => w.status === "approved")
        .map((w) => ({
          id: `wfh-${w.id}`,
          title: `${w.user?.full_name || "You"} - WFH`,
          start: w.start_date,
          end: w.end_date,
          backgroundColor: WFH_COLOR,
          borderColor: WFH_COLOR,
          textColor: "#fff",
          extendedProps: { type: "wfh", data: w },
        }));

      setEvents([...leaveEvents, ...holidayEvents, ...wfhEvents]);
    }).catch(() => {
      // Fallback: load without WFH if endpoint fails
      Promise.all([leaveFetch, getHolidays(year)]).then(([leavesRes, holidaysRes]) => {
        const leaveEvents = leavesRes.data.map((l) => ({
          id: `leave-${l.id}`,
          title: `${l.user?.full_name || "You"} - ${getLeaveDisplayType(l)}`,
          start: l.start_date,
          end: l.end_date,
          backgroundColor: isWeekendWorkRequest(l) ? WEEKEND_WORK_COLOR : (STATUS_COLORS[l.status] || "#6b7280"),
          borderColor: isWeekendWorkRequest(l) ? WEEKEND_WORK_COLOR : (STATUS_COLORS[l.status] || "#6b7280"),
          textColor: "#fff",
          extendedProps: { type: "leave", data: l },
        }));
        const holidayEvents = holidaysRes.data.map((h) => ({
          id: `holiday-${h.id}`,
          title: h.name,
          start: h.date,
          backgroundColor: HOLIDAY_COLORS[h.holiday_type] || "#6366f1",
          borderColor: HOLIDAY_COLORS[h.holiday_type] || "#6366f1",
          textColor: "#fff",
          extendedProps: { type: "holiday", data: h },
        }));
        setEvents([...leaveEvents, ...holidayEvents]);
      });
    });
  }, [isTeamView, isAdminView]);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-5">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Leave Calendar</h1>
          <p className="text-gray-400 text-sm mt-0.5">View team leaves, weekend work requests, and company holidays</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
          <MdCalendarMonth className="text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">{new Date().getFullYear()}</span>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Legend:</span>
        {LEGEND.map((l) => (
          <div key={l.label} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
            <span className="text-xs font-medium text-gray-600">{l.label}</span>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden">
        <style>{`
          .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 800; color: #111827; }
          .fc .fc-button { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; color: #374151 !important; border-radius: 8px !important; font-weight: 600; font-size: 0.8rem; text-transform: capitalize; }
          .fc .fc-button:hover { background: #e5e7eb !important; }
          .fc .fc-button-primary:not(:disabled).fc-button-active { background: #2563eb !important; border-color: #2563eb !important; color: white !important; }
          .fc .fc-day-today { background: #eff6ff !important; }
          .fc .fc-daygrid-event { border-radius: 6px !important; font-size: 0.72rem; font-weight: 600; padding: 1px 6px; }
          .fc .fc-col-header-cell-cushion { font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; }
          .fc .fc-daygrid-day-number { font-size: 0.82rem; color: #374151; font-weight: 500; }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,dayGridWeek" }}
          events={events}
          eventClick={(info) => setSelected(info.event.extendedProps)}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
        />
      </motion.div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-5 flex items-center justify-between ${
                selected.type === "holiday"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-700"
                  : selected.type === "wfh"
                  ? "bg-gradient-to-r from-sky-600 to-cyan-700"
                  : "bg-gradient-to-r from-slate-800 to-slate-900"
              }`}>
                <div className="flex items-center gap-2.5">
                  {selected.type === "holiday" ? (
                    <MdCelebration className="text-white text-xl" />
                  ) : selected.type === "wfh" ? (
                    <MdHomeWork className="text-white text-xl" />
                  ) : (
                    <MdCalendarMonth className="text-white text-xl" />
                  )}
                  <div>
                    <h3 className="text-white font-bold">
                      {selected.type === "holiday" ? "Holiday" : selected.type === "wfh" ? "Work From Home" : "Request Details"}
                    </h3>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                  <MdClose className="text-sm" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {selected.type === "wfh" ? (
                  <>
                    {[
                      { label: "Employee", value: selected.data.user?.full_name },
                      { label: "From", value: selected.data.start_date },
                      { label: "To", value: selected.data.end_date },
                      { label: "Days", value: `${selected.data.total_days} day(s)` },
                      { label: "Status", value: selected.data.status, capitalize: true },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-400">{row.label}</span>
                        <span className={`text-sm font-semibold text-gray-800 ${row.capitalize ? "capitalize" : ""}`}>{row.value}</span>
                      </div>
                    ))}
                    {selected.data.reason && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-400 mb-1">Reason</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.data.reason}</p>
                      </div>
                    )}
                  </>
                ) : selected.type === "leave" ? (
                  <>
                    {[
                      { label: "Employee", value: selected.data.user?.full_name },
                      {
                        label: isWeekendWorkRequest(selected.data) ? "Request Type" : "Leave Type",
                        value: getLeaveDisplayType(selected.data),
                        capitalize: !isWeekendWorkRequest(selected.data),
                      },
                      { label: "From", value: selected.data.start_date },
                      { label: "To", value: selected.data.end_date },
                      { label: "Days", value: `${selected.data.total_days} day(s)` },
                      { label: "Status", value: selected.data.status.replace(/_/g, " "), capitalize: true },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-400">{row.label}</span>
                        <span className={`text-sm font-semibold text-gray-800 ${row.capitalize ? "capitalize" : ""}`}>{row.value}</span>
                      </div>
                    ))}
                    {selected.data.reason && (
                      <div className="pt-1">
                        <p className="text-xs text-gray-400 mb-1">Reason</p>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.data.reason}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {[
                      { label: "Holiday Name", value: selected.data.name },
                      { label: "Date", value: selected.data.date },
                      { label: "Type", value: selected.data.holiday_type, capitalize: true },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-400">{row.label}</span>
                        <span className={`text-sm font-semibold text-gray-800 ${row.capitalize ? "capitalize" : ""}`}>{row.value}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="px-5 pb-5">
                <button onClick={() => setSelected(null)} className="btn-secondary w-full py-2.5">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
