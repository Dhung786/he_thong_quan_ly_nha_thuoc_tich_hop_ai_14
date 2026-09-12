import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { medicinesRequest } from "../lib/api";
import { reportSummaryRequest } from "../lib/manager-api";

const roleLabels: Record<string, string> = {
  MANAGER: "Quản lý",
  PHARMACIST: "Dược sĩ",
  CASHIER: "Thu ngân",
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
    <div className="min-h-screen bg-[#081426] text-slate-100 lg:grid lg:grid-cols-[330px_1fr]">
      <ManagerSidebar />
      <div className="min-w-0 bg-[radial-gradient(circle_at_18%_5%,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.06),transparent_24%)]">
        <header className="sticky top-0 z-20 flex min-h-[84px] items-center justify-between border-b border-slate-800/80 bg-[#0b1427]/90 px-5 backdrop-blur-xl sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">MediCare AI · Quản lý</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Tổng quan hệ thống</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-right sm:block">
              <p className="text-sm font-semibold text-slate-200">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <button onClick={() => void handleLogout()} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-700/70 bg-gradient-to-br from-[#16253c] via-[#122038] to-[#0f1a2e] p-7 shadow-2xl shadow-slate-950/25 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">Bảng điều hành</span>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Chào mừng trở lại, {auth.user?.username}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Theo dõi nhanh hoạt động nhà thuốc, tồn kho, doanh thu và các lô cần chú ý từ một màn hình duy nhất.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <QuickLink to="/manager/sales" label="Bán thuốc" icon="🧾" />
                <QuickLink to="/manager/inventory" label="Kiểm tra tồn" icon="📦" />
                <QuickLink to="/manager/expiry" label="Xem hạn dùng" icon="⏳" />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon="💰" label="Doanh thu" value={summary.isPending ? "…" : summary.isError ? "—" : formatMoney(summaryData?.revenue)} note={`${summaryData?.finalized_invoice_count ?? 0} hóa đơn đã hoàn tất`} tone="emerald" />
            <MetricCard icon="💊" label="Tổng số thuốc" value={totalMedicines} note="Số thuốc đang có trong danh mục" tone="sky" />
            <MetricCard icon="📦" label="Tổng tồn kho" value={summary.isPending ? "…" : summary.isError ? "—" : summaryData?.inventory_units ?? 0} note="Tổng số đơn vị thuốc còn trong kho" tone="amber" />
            <MetricCard icon="⚠️" label="Lô sắp hết hạn" value={summary.isPending ? "…" : summary.isError ? "—" : summaryData?.expiring_lots ?? 0} note="Trong 90 ngày tới" tone="rose" />
          </section>

          <section className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chức năng quản lý</p>
                <h2 className="mt-1 text-2xl font-bold">Truy cập nhanh</h2>
              </div>
              <p className="hidden text-sm text-slate-500 md:block">Chọn chức năng bạn muốn thao tác</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <FeaturePanel title="Quản lý thuốc" icon="💊" to="/catalog" accent="cyan">Quản lý danh sách thuốc, nhóm thuốc và đơn vị tính.</FeaturePanel>
              <FeaturePanel title="Quản lý nhập thuốc" icon="📥" to="/manager/imports" accent="violet">Thêm nhà cung cấp, tạo lô nhập và theo dõi thông tin nhập thuốc.</FeaturePanel>
              <FeaturePanel title="Bán thuốc" icon="🧾" to="/manager/sales" accent="emerald">Tạo hóa đơn, chọn lô bán và hoàn tất giao dịch.</FeaturePanel>
              <FeaturePanel title="Tồn kho" icon="📦" to="/manager/inventory" accent="amber">Theo dõi số lượng tồn theo từng lô và lọc thuốc tồn thấp.</FeaturePanel>
              <FeaturePanel title="Hạn sử dụng" icon="⏳" to="/manager/expiry" accent="rose">Theo dõi các lô sắp hết hạn và đã hết hạn.</FeaturePanel>
              <FeaturePanel title="Tra cứu thuốc" icon="🔎" to="/manager/lookup" accent="sky">Tìm kiếm thuốc theo tên, mã, nhóm, lô và hạn sử dụng.</FeaturePanel>
              <FeaturePanel title="Báo cáo - Thống kê" icon="📈" to="/manager/reports" accent="blue">Theo dõi doanh thu, tồn kho và tình trạng hạn sử dụng.</FeaturePanel>
              <FeaturePanel title="Trợ lý AI" icon="🤖" to="/manager/ai" accent="fuchsia">Tóm tắt thông tin thuốc, hỗ trợ báo cáo hạn dùng và hỏi đáp quy trình nội bộ.</FeaturePanel>
              <FeaturePanel title="Tài khoản / Phân quyền" icon="👥" to="/manager/users" accent="slate">Tạo tài khoản, đổi vai trò, khóa hoặc mở khóa tài khoản và đặt lại mật khẩu.</FeaturePanel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-200">
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MetricCard({ icon, label, value, note, tone }: { icon: string; label: string; value: string | number; note: string; tone: "emerald" | "sky" | "amber" | "rose" }) {
  const styles = {
    emerald: { value: "text-emerald-300", icon: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20", glow: "from-emerald-400/10" },
    sky: { value: "text-sky-300", icon: "bg-sky-400/10 text-sky-300 ring-sky-400/20", glow: "from-sky-400/10" },
    amber: { value: "text-amber-300", icon: "bg-amber-400/10 text-amber-300 ring-amber-400/20", glow: "from-amber-400/10" },
    rose: { value: "text-rose-300", icon: "bg-rose-400/10 text-rose-300 ring-rose-400/20", glow: "from-rose-400/10" },
  }[tone];

  return (
    <div className={`relative overflow-hidden rounded-[28px] border border-slate-700/70 bg-gradient-to-br ${styles.glow} via-[#16243a] to-[#132036] p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-slate-600`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className={`mt-3 text-3xl font-black tracking-tight ${styles.value}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ring-1 ${styles.icon}`}>{icon}</div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

function FeaturePanel({ title, icon, to, children, accent }: { title: string; icon: string; to: string; children: string; accent: "cyan" | "violet" | "emerald" | "amber" | "rose" | "sky" | "blue" | "fuchsia" | "slate" }) {
  const accentClass = {
    cyan: "from-cyan-500/15 text-cyan-300 group-hover:border-cyan-400/40",
    violet: "from-violet-500/15 text-violet-300 group-hover:border-violet-400/40",
    emerald: "from-emerald-500/15 text-emerald-300 group-hover:border-emerald-400/40",
    amber: "from-amber-500/15 text-amber-300 group-hover:border-amber-400/40",
    rose: "from-rose-500/15 text-rose-300 group-hover:border-rose-400/40",
    sky: "from-sky-500/15 text-sky-300 group-hover:border-sky-400/40",
    blue: "from-blue-500/15 text-blue-300 group-hover:border-blue-400/40",
    fuchsia: "from-fuchsia-500/15 text-fuchsia-300 group-hover:border-fuchsia-400/40",
    slate: "from-slate-500/15 text-slate-300 group-hover:border-slate-400/40",
  }[accent];

  return (
    <Link to={to} className={`group relative overflow-hidden rounded-[28px] border border-slate-700/70 bg-gradient-to-br ${accentClass.split(" ")[0]} via-[#16243a] to-[#132036] p-6 transition duration-200 hover:-translate-y-1 ${accentClass.split(" ")[2]}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-inner">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-100 transition group-hover:text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{children}</p>
        </div>
      </div>
      <div className={`mt-5 flex items-center justify-between text-sm font-semibold ${accentClass.split(" ")[1]}`}>
        <span>Mở chức năng</span>
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}
