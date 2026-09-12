import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { medicinesRequest } from "../lib/api";
import { reportSummaryRequest } from "../lib/manager-api";

const roleLabels: Record<string, string> = {
  MANAGER: "Quản lý",
  PHARMACIST: "Dược sĩ",
  CUSTOMER: "Khách hàng",
};

function formatMoney(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? `${parsed.toLocaleString("vi-VN")} đ` : "—";
}

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken ?? "";
  const isManager = auth.user?.role === "MANAGER";
  const roleLabel = roleLabels[auth.user?.role ?? ""] ?? auth.user?.role ?? "-";

  const medicines = useQuery({
    queryKey: ["manager-dashboard-medicines"],
    queryFn: () => medicinesRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
    retry: false,
  });

  const summary = useQuery({
    queryKey: ["manager-dashboard-summary"],
    queryFn: () => reportSummaryRequest(accessToken, 90),
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
  const summaryData = summary.data;

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
            <MetricCard label="Doanh thu" value={summary.isPending ? "…" : summary.isError ? "—" : formatMoney(summaryData?.revenue)} note={`${summaryData?.finalized_invoice_count ?? 0} hóa đơn đã hoàn tất`} accent="emerald" />
            <MetricCard label="Tổng số thuốc" value={totalMedicines} note="Số thuốc đang có trong danh mục" />
            <MetricCard label="Tổng tồn kho" value={summary.isPending ? "…" : summary.isError ? "—" : summaryData?.inventory_units ?? 0} note="Tổng số đơn vị thuốc còn trong kho" accent="amber" />
            <MetricCard label="Lô sắp hết hạn" value={summary.isPending ? "…" : summary.isError ? "—" : summaryData?.expiring_lots ?? 0} note="Trong 90 ngày tới" accent="rose" />
          </section>

          <section className="mt-7 grid gap-5 xl:grid-cols-2">
            <FeaturePanel title="2. Quản lý thuốc" icon="💊" to="/catalog">Quản lý danh sách thuốc, nhóm thuốc và đơn vị tính.</FeaturePanel>
            <FeaturePanel title="3. Quản lý nhập thuốc" icon="📥" to="/manager/imports">Thêm nhà cung cấp, tạo lô nhập và theo dõi thông tin nhập thuốc.</FeaturePanel>
            <FeaturePanel title="4. Bán thuốc" icon="🧾" to="/manager/sales">Tạo hóa đơn, chọn lô bán và hoàn tất giao dịch.</FeaturePanel>
            <FeaturePanel title="5. Tồn kho" icon="📦" to="/manager/inventory">Theo dõi số lượng tồn theo từng lô và lọc thuốc tồn thấp.</FeaturePanel>
            <FeaturePanel title="6. Hạn sử dụng" icon="⏳" to="/manager/expiry">Theo dõi các lô sắp hết hạn và đã hết hạn.</FeaturePanel>
            <FeaturePanel title="7. Tra cứu thuốc" icon="🔎" to="/manager/lookup">Tìm kiếm thuốc theo tên, mã, nhóm, lô và hạn sử dụng.</FeaturePanel>
            <FeaturePanel title="8. Báo cáo - Thống kê" icon="📈" to="/manager/reports">Theo dõi doanh thu, tồn kho và tình trạng hạn sử dụng.</FeaturePanel>
            <FeaturePanel title="9. Trợ lý AI" icon="🤖" to="/manager/ai">Tóm tắt thông tin thuốc, hỗ trợ báo cáo hạn dùng và hỏi đáp quy trình nội bộ.</FeaturePanel>
            <FeaturePanel title="10. Tài khoản / Phân quyền" icon="👥" to="/manager/users">Tạo tài khoản, đổi vai trò, khóa hoặc mở khóa tài khoản và đặt lại mật khẩu.</FeaturePanel>
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

function FeaturePanel({ title, icon, to, children }: { title: string; icon: string; to: string; children: string }) {
  return (
    <Link to={to} className="group rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 transition hover:-translate-y-0.5 hover:border-sky-500/50 hover:bg-[#1b2a42]">
      <div className="flex items-center gap-3"><span className="text-2xl">{icon}</span><h2 className="text-lg font-bold group-hover:text-sky-300">{title}</h2></div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{children}</p>
      <p className="mt-5 text-sm font-semibold text-sky-400">Mở chức năng →</p>
    </Link>
  );
}
