import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { RoleUseCasePanel } from "../components/RoleUseCasePanel";
import { healthRequest, medicinesRequest } from "../lib/api";
import { managerUseCases } from "../lib/role-use-cases";

const roleLabels: Record<string, string> = {
  MANAGER: "Quản lý",
  PHARMACIST: "Dược sĩ",
  CUSTOMER: "Khách hàng",
};

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken ?? "";
  const isManager = auth.user?.role === "MANAGER";
  const roleLabel = roleLabels[auth.user?.role ?? ""] ?? auth.user?.role ?? "-";

  const health = useQuery({ queryKey: ["health"], queryFn: healthRequest, retry: false, refetchInterval: 30_000 });
  const medicines = useQuery({
    queryKey: ["manager-dashboard-medicines"],
    queryFn: () => medicinesRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
    retry: false,
  });

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  if (!isManager) {
    return (
      <main className="min-h-screen bg-slate-950 p-5 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Xin chào, {auth.user?.username}</h1>
          <p className="mt-2 text-slate-400">Vai trò hiện tại: {roleLabel}</p>
          <button onClick={() => void handleLogout()} className="mt-6 rounded-xl border border-slate-700 px-4 py-2.5">Đăng xuất</button>
        </div>
      </main>
    );
  }

  const totalMedicines = medicines.isPending ? "…" : medicines.isError ? "—" : medicines.data?.length ?? 0;
  const aiConfigured = health.data?.ai === "configured";

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[330px_1fr]">
      <ManagerSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">MediCare AI · Quản lý</p>
            <h1 className="mt-1 text-2xl font-bold">Tổng quan hệ thống</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-sm text-slate-300">Quản lý</p><p className="text-xs text-slate-500">{auth.user?.username}</p></div>
            <span className="rounded-xl border border-sky-700/60 bg-sky-900/20 px-3 py-2 text-xs font-semibold text-sky-300">MANAGER</span>
            <button onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Doanh thu" value="—" note="Chờ UC004 + UC009" accent="emerald" />
            <MetricCard label="Tổng số thuốc" value={totalMedicines} note="Dữ liệu thật từ UC002" />
            <MetricCard label="Thuốc tồn thấp" value="—" note="Chờ UC006" accent="amber" />
            <MetricCard label="Thuốc sắp hết hạn" value="—" note="Chờ UC008" accent="rose" />
          </section>

          <div className="mt-7">
            <RoleUseCasePanel
              title="Use Case dành cho Quản lý"
              subtitle="Các Use Case được gắn trực tiếp vào giao diện Quản lý theo SRS v1.0. UC005 được hiển thị theo đặc tả chi tiết của UC005, trong đó Quản lý là một tác nhân."
              useCases={managerUseCases}
            />
          </div>

          <section className="mt-7 grid gap-5 xl:grid-cols-2">
            <FeaturePanel title="2. Quản lý thuốc" icon="💊" to="/catalog" status="UC002 đang hoạt động">
              Danh sách thuốc, nhóm thuốc và đơn vị tính. Đây là module đã kết nối PostgreSQL thật.
            </FeaturePanel>
            <FeaturePanel title="3. Quản lý nhập thuốc" icon="📥" to="/manager/imports" status="Chờ UC003/UC005">
              Danh sách lô nhập, thêm lô nhập và nhà cung cấp.
            </FeaturePanel>
            <FeaturePanel title="4. Bán thuốc" icon="🧾" to="/manager/sales" status="Chờ UC004">
              Giao diện bán thuốc và hóa đơn. Chưa ghi giao dịch thật khi quy tắc chọn lô chưa được chốt.
            </FeaturePanel>
            <FeaturePanel title="5. Tồn kho" icon="📦" to="/manager/inventory" status="Chờ UC006">
              Danh sách tồn kho và cảnh báo tồn thấp.
            </FeaturePanel>
            <FeaturePanel title="6. Hạn sử dụng" icon="⏳" to="/manager/expiry" status="Chờ UC008">
              Theo dõi thuốc sắp hết hạn và thuốc đã hết hạn.
            </FeaturePanel>
            <FeaturePanel title="7. Tra cứu thuốc" icon="🔎" to="/manager/lookup" status="Có dữ liệu UC002">
              Tìm kiếm nhanh theo mã hoặc tên thuốc từ dữ liệu thật.
            </FeaturePanel>
            <FeaturePanel title="8. Báo cáo - Thống kê" icon="📈" to="/manager/reports" status="Chờ UC009/UC011">
              Doanh thu, tồn kho và thuốc sắp hết hạn.
            </FeaturePanel>
            <FeaturePanel title="9. Trợ lý AI" icon="🤖" to="/manager/ai" status={aiConfigured ? "AI provider đã cấu hình" : "AI provider chưa cấu hình"}>
              AI tóm tắt thông tin thuốc, AI báo cáo thuốc sắp hết hạn và chatbot quy trình nội bộ.
            </FeaturePanel>
            <FeaturePanel title="10. Tài khoản / Phân quyền" icon="👥" to="/manager/users" status="Chờ API quản trị">
              Quản lý tài khoản Quản lý, Dược sĩ và Khách hàng; khóa/mở tài khoản và phân quyền khi backend sẵn sàng.
            </FeaturePanel>
          </section>

          <section className="mt-7 grid gap-4 md:grid-cols-3">
            <StatusCard label="Core application" value={health.data?.core ?? "checking"} />
            <StatusCard label="PostgreSQL" value={health.data?.database ?? "checking"} />
            <StatusCard label="Migration" value={health.data?.migration ?? "checking"} />
          </section>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, accent = "default" }: { label: string; value: string | number; note: string; accent?: "default" | "amber" | "emerald" | "rose" }) {
  const valueClass = accent === "amber" ? "text-amber-400" : accent === "emerald" ? "text-emerald-400" : accent === "rose" ? "text-rose-400" : "text-slate-50";
  return <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 shadow-xl shadow-slate-950/10"><p className="text-sm text-slate-400">{label}</p><p className={`mt-3 text-3xl font-black ${valueClass}`}>{value}</p><p className="mt-3 text-xs leading-5 text-slate-500">{note}</p></div>;
}

function FeaturePanel({ title, icon, to, status, children }: { title: string; icon: string; to: string; status: string; children: string }) {
  return (
    <Link to={to} className="group rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 transition hover:-translate-y-0.5 hover:border-sky-500/50 hover:bg-[#1b2a42]">
      <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="text-2xl">{icon}</span><h2 className="text-lg font-bold group-hover:text-sky-300">{title}</h2></div><span className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-[11px] text-slate-400">{status}</span></div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{children}</p>
      <p className="mt-5 text-sm font-semibold text-sky-400">Mở chức năng →</p>
    </Link>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  const healthy = value === "ok" || value.startsWith("000");
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-5"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><div className="mt-3 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${healthy ? "bg-emerald-400" : "bg-amber-400"}`} /><p className="text-sm font-semibold text-slate-200">{value.replaceAll("_", " ")}</p></div></div>;
}
