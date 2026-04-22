import { Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { fetchPending, fetchPendingWFH } from "../../store/slices/leaveSlice";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const { sidebarOpen } = useSelector((s) => s.ui);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    const managerRoles = ["admin", "main_manager", "hr", "manager", "team_lead"];
    if (!user?.role || !managerRoles.includes(user.role)) return;

    const refresh = () => {
      dispatch(fetchPending());
      dispatch(fetchPendingWFH());
    };

    refresh();
    const interval = setInterval(refresh, 60000); // refresh every 60 seconds
    return () => clearInterval(interval);
  }, [user?.role]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${
          sidebarOpen ? "ml-[210px]" : "ml-[68px]"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
