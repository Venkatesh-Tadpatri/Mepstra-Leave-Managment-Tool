import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8000/api" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;

// Auth
export const login = (data) => API.post("/auth/login", data);
export const register = (data) => API.post("/auth/register", data);

// Users
export const getMe = () => API.get("/users/me");
export const updateMe = (data) => API.put("/users/me", data);
export const uploadAvatar = (file) => {
  const form = new FormData();
  form.append("file", file);
  return API.post("/users/me/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
};
export const getUsers = (params) => API.get("/users", { params });
export const getManagers = () => API.get("/users/managers");
export const getAdminUser = () => API.get("/users/admin");
export const getUser = (id) => API.get(`/users/${id}`);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deactivateUser = (id) => API.delete(`/users/${id}`);
export const getMyEmergencyOverrideToday = () => API.get("/users/me/emergency-override-today");
export const getTeamOverridesToday = () => API.get("/users/overrides-today");
export const enableEmergencyOverrideToday = (userId) => API.post(`/users/${userId}/emergency-override-today`);
export const disableEmergencyOverrideToday = (userId) => API.delete(`/users/${userId}/emergency-override-today`);
export const resetUserPassword = (userId, newPassword) => API.post(`/users/${userId}/reset-password`, { new_password: newPassword });

// Leaves
export const applyLeave = (data) => API.post("/leaves", data);
export const getLeaves = (params) => API.get("/leaves", { params });
export const getTeamLeaves = (params) => API.get("/leaves", { params: { ...params, team: true } });
export const getPendingLeaves = () => API.get("/leaves/pending");
export const getLeave = (id) => API.get(`/leaves/${id}`);
export const actionLeave = (id, data) => API.put(`/leaves/${id}/action`, data);
export const cancelLeave = (id) => API.delete(`/leaves/${id}`);
export const getMyBalance = (year) => API.get("/leaves/balance", { params: { year } });
export const getUserBalance = (userId, year) => API.get(`/leaves/balance/${userId}`, { params: { year } });

// Holidays
export const getHolidays = (year) => API.get("/holidays", { params: { year } });
export const createHoliday = (data) => API.post("/holidays", data);
export const updateHoliday = (id, data) => API.put(`/holidays/${id}`, data);
export const deleteHoliday = (id) => API.delete(`/holidays/${id}`);
export const bulkCreateHolidays = (data) => API.post("/holidays/bulk", data);

// Departments
export const getDepartments = () => API.get("/departments");
export const createDepartment = (data) => API.post("/departments", data);
export const updateDepartment = (id, data) => API.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => API.delete(`/departments/${id}`);

// Dashboard
export const getDashboardStats = () => API.get("/dashboard/stats");
export const getMyStats = () => API.get("/dashboard/my-stats");
export const getOnLeaveToday = () => API.get("/dashboard/on-leave-today");
export const getLeaveSchedule = (month, year, day, department_id) =>
  API.get("/dashboard/leave-schedule", { params: { month, year, day: day || undefined, department_id: department_id || undefined } });
export const getEmployeeLeaveReport = (year) => API.get("/dashboard/employee-leave-report", { params: { year } });

// Allowed Emails (admin whitelist)
export const getAllowedEmails = () => API.get("/allowed-emails");
export const addAllowedEmail = (data) => API.post("/allowed-emails", data);
export const removeAllowedEmail = (id) => API.delete(`/allowed-emails/${id}`);
