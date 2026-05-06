// ================================================================
//  api.js — Centralized API Endpoints
//  Base: http://localhost:8000/api
//  Change BASE_URL below when deploying to server
// ================================================================

import axios from "axios";

const BASE_URL = "http://localhost:8000/api";

// ---- Axios Instance ------------------------------------------------
const API = axios.create({ baseURL: BASE_URL });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes("/auth/");
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;

// ---- Auth ----------------------------------------------------------
export const LOGIN_API                     = `${BASE_URL}/auth/login`;
export const REGISTER_API                  = `${BASE_URL}/auth/register`;
export const SEND_OTP_API                  = `${BASE_URL}/auth/send-otp`;
export const VERIFY_OTP_API                = `${BASE_URL}/auth/verify-otp`;

export const login                         = (data) => API.post("/auth/login", data);
export const register                      = (data) => API.post("/auth/register", data);
export const sendOTP                       = (data) => API.post("/auth/send-otp", data);
export const verifyOTP                     = (data) => API.post("/auth/verify-otp", data);

// ---- Users ---------------------------------------------------------
export const ME_API                        = `${BASE_URL}/users/me`;
export const ME_AVATAR_API                 = `${BASE_URL}/users/me/avatar`;
export const USERS_API                     = `${BASE_URL}/users`;
export const MANAGERS_API                  = `${BASE_URL}/users/managers`;
export const ADMIN_USER_API                = `${BASE_URL}/users/admin`;
export const USER_BY_ID_API                = (id) => `${BASE_URL}/users/${id}`;
export const RESET_PASSWORD_API            = (id) => `${BASE_URL}/users/${id}/reset-password`;
export const EMERGENCY_OVERRIDE_ME_API     = `${BASE_URL}/users/me/emergency-override-today`;
export const TEAM_OVERRIDES_TODAY_API      = `${BASE_URL}/users/overrides-today`;
export const EMERGENCY_OVERRIDE_API        = (id) => `${BASE_URL}/users/${id}/emergency-override-today`;

export const getMe                         = () => API.get("/users/me");
export const updateMe                      = (data) => API.put("/users/me", data);
export const uploadAvatar                  = (file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/users/me/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
};
export const removeAvatar                  = () => API.delete("/users/me/avatar");
export const getUsers                      = (params) => API.get("/users", { params });
export const getManagers                   = () => API.get("/users/managers");
export const getAdminUser                  = () => API.get("/users/admin");
export const getUser                       = (id) => API.get(`/users/${id}`);
export const updateUser                    = (id, data) => API.put(`/users/${id}`, data);
export const deactivateUser                = (id) => API.delete(`/users/${id}`);
export const getMyEmergencyOverrideToday   = () => API.get("/users/me/emergency-override-today");
export const getTeamOverridesToday         = () => API.get("/users/overrides-today");
export const enableEmergencyOverrideToday  = (userId) => API.post(`/users/${userId}/emergency-override-today`);
export const disableEmergencyOverrideToday = (userId) => API.delete(`/users/${userId}/emergency-override-today`);
export const resetUserPassword             = (userId, newPassword) =>
  API.post(`/users/${userId}/reset-password`, { new_password: newPassword });

// ---- Leaves --------------------------------------------------------
export const LEAVES_API                    = `${BASE_URL}/leaves`;
export const PENDING_LEAVES_API            = `${BASE_URL}/leaves/pending`;
export const LEAVE_BALANCE_API             = `${BASE_URL}/leaves/balance`;
export const SPECIAL_CREDITS_API           = `${BASE_URL}/leaves/special-credits`;
export const LEAVE_BALANCE_BY_ID_API       = (id) => `${BASE_URL}/leaves/balance/${id}`;
export const LEAVE_BY_ID_API               = (id) => `${BASE_URL}/leaves/${id}`;
export const LEAVE_ACTION_API              = (id) => `${BASE_URL}/leaves/${id}/action`;

export const applyLeave                    = (data) => API.post("/leaves", data);
export const getLeaves                     = (params) => API.get("/leaves", { params });
export const getTeamLeaves                 = (params) => API.get("/leaves", { params: { ...params, team: true } });
export const getPendingLeaves              = () => API.get("/leaves/pending");
export const getLeave                      = (id) => API.get(`/leaves/${id}`);
export const actionLeave                   = (id, data) => API.put(`/leaves/${id}/action`, data);
export const revokeLeave                   = (id, comment) => API.put(`/leaves/${id}/action`, { action: "revoke", comment });
export const cancelLeave                   = (id) => API.delete(`/leaves/${id}`);
export const getMyBalance                  = (year) => API.get("/leaves/balance", { params: { year } });
export const getMySpecialCredits           = (year) => API.get("/leaves/special-credits", { params: { year } });
export const getUserBalance                = (userId, year) => API.get(`/leaves/balance/${userId}`, { params: { year } });

// ---- Holidays ------------------------------------------------------
export const HOLIDAYS_API                  = `${BASE_URL}/holidays`;
export const HOLIDAY_BY_ID_API             = (id) => `${BASE_URL}/holidays/${id}`;
export const HOLIDAYS_BULK_API             = `${BASE_URL}/holidays/bulk`;

export const getHolidays                   = (year) => API.get("/holidays", { params: { year } });
export const createHoliday                 = (data) => API.post("/holidays", data);
export const updateHoliday                 = (id, data) => API.put(`/holidays/${id}`, data);
export const deleteHoliday                 = (id) => API.delete(`/holidays/${id}`);
export const bulkCreateHolidays            = (data) => API.post("/holidays/bulk", data);
export const bulkUpsertHolidays            = (data) => API.post("/holidays/bulk-upsert", data);

// ---- Departments ---------------------------------------------------
export const DEPARTMENTS_API               = `${BASE_URL}/departments`;
export const DEPARTMENT_BY_ID_API          = (id) => `${BASE_URL}/departments/${id}`;

export const getDepartments                = () => API.get("/departments");
export const createDepartment              = (data) => API.post("/departments", data);
export const updateDepartment              = (id, data) => API.put(`/departments/${id}`, data);
export const deleteDepartment              = (id) => API.delete(`/departments/${id}`);

// ---- Dashboard -----------------------------------------------------
export const DASHBOARD_STATS_API           = `${BASE_URL}/dashboard/stats`;
export const MY_STATS_API                  = `${BASE_URL}/dashboard/my-stats`;
export const ON_LEAVE_TODAY_API            = `${BASE_URL}/dashboard/on-leave-today`;
export const LEAVE_SCHEDULE_API            = `${BASE_URL}/dashboard/leave-schedule`;
export const EMPLOYEE_LEAVE_REPORT_API     = `${BASE_URL}/dashboard/employee-leave-report`;

export const getDashboardStats             = () => API.get("/dashboard/stats");
export const getMyStats                    = () => API.get("/dashboard/my-stats");
export const getOnLeaveToday               = () => API.get("/dashboard/on-leave-today");
export const getLeaveSchedule              = (month, year, day, department_id) =>
  API.get("/dashboard/leave-schedule", {
    params: { month, year, day: day || undefined, department_id: department_id || undefined },
  });
export const getEmployeeLeaveReport        = (year) => API.get("/dashboard/employee-leave-report", { params: { year } });

// ---- Work From Home ------------------------------------------------
export const WFH_API                       = `${BASE_URL}/wfh`;
export const MY_WFH_API                    = `${BASE_URL}/wfh/mine`;
export const PENDING_WFH_API               = `${BASE_URL}/wfh/pending`;
export const ALL_WFH_API                   = `${BASE_URL}/wfh/all`;
export const WFH_TODAY_API                 = `${BASE_URL}/wfh/today`;
export const WFH_BY_ID_API                 = (id) => `${BASE_URL}/wfh/${id}`;
export const WFH_REPORT_API                = `${BASE_URL}/wfh/report`;

export const submitWFH                     = (data) => API.post("/wfh", data);
export const getMyWFH                      = () => API.get("/wfh/mine");
export const getPendingWFH                 = () => API.get("/wfh/pending");
export const getAllWFH                     = () => API.get("/wfh/all");
export const getWFHToday                   = () => API.get("/wfh/today");
export const actionWFH                     = (id, data) => API.patch(`/wfh/${id}`, data);
export const cancelWFH                     = (id) => API.delete(`/wfh/${id}`);
export const getWFHReport                  = (year) => API.get("/wfh/report", { params: { year } });

// ---- Allowed Emails ------------------------------------------------
export const ALLOWED_EMAILS_API            = `${BASE_URL}/allowed-emails`;
export const ALLOWED_EMAIL_BY_ID_API       = (id) => `${BASE_URL}/allowed-emails/${id}`;

export const getAllowedEmails              = () => API.get("/allowed-emails");
export const addAllowedEmail              = (data) => API.post("/allowed-emails", data);
export const bulkUpsertAllowedEmails      = (data) => API.post("/allowed-emails/bulk-upsert", data);
export const updateAllowedEmail           = (id, data) => API.patch(`/allowed-emails/${id}`, data);
export const removeAllowedEmail           = (id) => API.delete(`/allowed-emails/${id}`);

// ---- Health --------------------------------------------------------
export const HEALTH_API                    = `${BASE_URL}/health`;
