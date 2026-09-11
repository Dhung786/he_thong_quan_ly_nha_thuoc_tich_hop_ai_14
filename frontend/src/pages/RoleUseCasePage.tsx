import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { RoleUseCasePanel } from "../components/RoleUseCasePanel";
import { managerUseCases, pharmacistUseCases } from "../lib/role-use-cases";

export function RoleUseCasePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const role = auth.user?.role;

  if (role !== "MANAGER" && role !== "PHARMACIST") {
    return <Navigate to="/dashboard" replace />;
  }

  const isManager = role === "MANAGER";
  const useCases = isManager ? managerUseCases : pharmacistUseCases;
  const roleLabel = isManager ? "Quản lý" : "Dược sĩ";

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#081528] text-slate-100 lg:grid lg:grid-cols-[330px_1fr]">
      {isManager ? <ManagerSidebar /> : <PharmacistSidebar />}
      <div className="min-w-0">
        <header className="flex min-h-[84px] flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0d152a] px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">SRS v1.0</p>
            <h1 className="mt-1 text-2xl font-bold">Use Case · {roleLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">
              {role}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <RoleUseCasePanel
            title={`Use Case dành cho ${roleLabel}`}
            subtitle={
              isManager
                ? "Danh sách chức năng được mapping cho Quản lý theo SRS. UC005 được giữ theo đặc tả chi tiết UC005, nơi Quản lý được ghi là tác nhân."
                : "Danh sách Use Case dành cho Dược sĩ theo SRS: đăng nhập, nhà cung cấp, tồn kho, tra cứu, cảnh báo, báo cáo và các chức năng AI."
            }
            useCases={useCases}
          />
        </main>
      </div>
    </div>
  );
}
