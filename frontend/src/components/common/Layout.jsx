import { Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { toggleSidebar } from "../../store/slices/uiSlice";
import { fetchPending, fetchPendingWFH } from "../../store/slices/leaveSlice";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const { sidebarOpen } = useSelector((s) => s.ui);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const managerRoles = ["admin", "main_manager", "hr", "manager", "team_lead"];
    if (!user?.role || !managerRoles.includes(user.role)) return;
    const refresh = () => {
      dispatch(fetchPending());
      dispatch(fetchPendingWFH());
    };
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isMobile={isMobile} />

      {/* Mobile backdrop overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      <div
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${
          isMobile ? "ml-0" : sidebarOpen ? "ml-[210px]" : "ml-[68px]"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
