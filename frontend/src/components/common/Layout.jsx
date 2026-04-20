import { Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toggleSidebar } from "../../store/slices/uiSlice";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
  const { sidebarOpen } = useSelector((s) => s.ui);
  const dispatch = useDispatch();

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
