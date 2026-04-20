import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Toaster } from "react-hot-toast";
import { loadUser } from "./store/slices/authSlice";
import Layout from "./components/common/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import LeavesPage from "./pages/LeavesPage";
import ApplyLeavePage from "./pages/ApplyLeavePage";
import PendingApprovalsPage from "./pages/PendingApprovalsPage";
import CalendarPage from "./pages/CalendarPage";
import HolidaysPage from "./pages/HolidaysPage";
import UpdateHolidaysPage from "./pages/UpdateHolidaysPage";
import EmployeesPage from "./pages/EmployeesPage";
import ProfilePage from "./pages/ProfilePage";
import DepartmentsPage from "./pages/DepartmentsPage";
import AllowedEmailsPage from "./pages/AllowedEmailsPage";
import WFHPage from "./pages/WFHPage";

function PrivateRoute({ children }) {
  const { isAuthenticated, token } = useSelector((s) => s.auth);
  if (!isAuthenticated && !token) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useSelector((s) => s.auth);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token) dispatch(loadUser());
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="leaves/apply" element={<ApplyLeavePage />} />
          <Route path="approvals" element={<PendingApprovalsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="holidays/update" element={<UpdateHolidaysPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="allowed-emails" element={<AllowedEmailsPage />} />
          <Route path="wfh" element={<WFHPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
