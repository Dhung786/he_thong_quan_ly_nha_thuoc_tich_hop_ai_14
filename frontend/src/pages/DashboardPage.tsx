import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import { healthRequest, medicinesRequest } from "../lib/api";

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

  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthRequest,
    retry: false,
    refetchInterval: 30_000,
  });

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-400">
                MediCare AI
              </p>
              <h1 className="mt-2 text-3xl font-bold">Xin chào, {auth.user?.username}</h1>
              <p className="mt-2 text-slate-400">Vai trò hiện tại: {roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-red-700 hover:text-red-300"
            >
              Đăng xuất
            </button>
          </div>

          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            <StatusCard
              label="Core application"
              value={health.data?.core ?? (health.isPending ? "checking" : "unavailable")}
            />
            <StatusCard
              label="PostgreSQL"
              value={health.data?.database ?? (health.isPending ? "checking" : "unavailable")}
            />
            <StatusCard
              label="Migration"
              value={health.data?.migration ?? (health.isPending ? "checking" : "unavailable")}
            />
            <StatusCard
              label="AI provider"
              value={health.data?.ai ?? (health.isPending ? "checking" : "unavailable")}
            />
          </section>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Dashboard quản lý chỉ dành cho vai trò MANAGER. Quyền của Dược sĩ và Khách hàng sẽ được mở theo từng Use Case đã được phê duyệt.
          </div>
        </div>
      </main>
    );
  }

  const totalMedicines = medicines.isPending ? "…" : medicines.isError ? "—" : medicines.data?.length ?? 0;
  const aiConfigured = health.data?.ai === "configured";

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <ManagerSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400 sm:hidden">
              MediCare AI
            </p>
            <h1 className="text-xl font-bold sm:text-2xl">Tổng quan</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-300">
              MANAGER
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold transition hover:border-red-700 hover:text-red-300"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Tổng số thuốc"
              value={totalMedicines}
              note={medicines.isError ? "Không tải được UC002" : "Dữ liệu thật từ danh mục thuốc"}
            />
            <MetricCard
              label="Tổng tồn kho"
              value="—"
              note="Chờ UC003 + UC006"
            />
            <MetricCard
              label="Thuốc tồn thấp"
              value="—"
              note="Chờ API cảnh báo tồn kho"
              accent="amber"
            />
            <MetricCard
              label="Doanh thu"
              value="—"
              note="Chờ UC004 + UC009"
              accent="emerald"
            />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_0.75fr]">
            <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 shadow-xl shadow-slate-950/20 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Thuốc cần chú ý</p>
                  <p className="mt-1 text-xs text-slate-500">Tồn thấp và sắp hết hạn</p>
                </div>
                <Link
                  to="/manager/alerts"
                  className="text-sm font-semibold text-sky-400 hover:text-sky-300"
                >
                  Xem cảnh báo →
                </Link>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700/60">
                <div className="grid grid-cols-[1.7fr_0.6fr_0.7fr] bg-slate-950/25 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <span>Thuốc</span>
                  <span>Tồn</span>
                  <span>Tối thiểu</span>
                </div>
                <div className="grid min-h-32 place-items-center px-6 py-8 text-center">
                  <div>
                    <p className="font-medium text-slate-300">Chưa có dữ liệu tồn kho</p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                      Dashboard không dùng số liệu demo. Danh sách này sẽ lấy dữ liệu PostgreSQL sau khi UC003/UC006 được triển khai.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 shadow-xl shadow-slate-950/20 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <h2 className="text-lg font-bold">AI Insight</h2>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-400">
                {aiConfigured
                  ? "AI provider đã được cấu hình. Các chức năng AI nghiệp vụ sẽ được mở theo UC010–UC013 sau khi hoàn tất Scope Guard và validation."
                  : "AI provider hiện chưa cấu hình. Hệ thống lõi vẫn hoạt động bình thường và không tạo dữ liệu AI giả."}
              </p>
              <Link
                to="/manager/ai"
                className="mt-7 block rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-sky-950/30 transition hover:brightness-110"
              >
                Mở khu vực AI Dược sĩ
              </Link>
            </div>
          </section>

          <section className="mt-7 grid gap-4 md:grid-cols-3">
            <QuickAction
              title="Quản lý thuốc"
              description="UC002 đang kết nối backend thật."
              to="/catalog"
              icon="💊"
            />
            <QuickAction
              title="Bán thuốc"
              description="Giao diện đã mở, backend UC004 đang chờ triển khai."
              to="/manager/sales"
              icon="🧾"
            />
            <QuickAction
              title="Kho thuốc"
              description="Chuẩn bị cho lô nhập, tồn kho và hạn dùng."
              to="/manager/inventory"
              icon="📦"
            />
          </section>

          <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/20 px-5 py-4 text-xs leading-6 text-slate-500">
            Trạng thái hệ thống: core <strong className="text-slate-300">{formatStatusValue(health.data?.core ?? "checking")}</strong>
            {" · "}database <strong className="text-slate-300">{formatStatusValue(health.data?.database ?? "checking")}</strong>
            {" · "}migration <strong className="text-slate-300">{formatStatusValue(health.data?.migration ?? "checking")}</strong>.
          </section>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  accent = "default",
}: {
  label: string;
  value: string | number;
  note: string;
  accent?: "default" | "amber" | "emerald";
}) {
  const valueClass =
    accent === "amber"
      ? "text-amber-400"
      : accent === "emerald"
        ? "text-emerald-400"
        : "text-slate-50";

  return (
    <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 shadow-xl shadow-slate-950/10">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${valueClass}`}>{value}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  to,
  icon,
}: {
  title: string;
  description: string;
  to: string;
  icon: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-700/70 bg-[#18253a] p-5 transition hover:-translate-y-0.5 hover:border-sky-500/50 hover:bg-[#1b2a42]"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-bold group-hover:text-sky-300">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function formatStatusValue(value: string): string {
  if (value === "not_configured") return "chưa cấu hình";
  if (value === "checking") return "đang kiểm tra";
  if (value === "unavailable") return "không khả dụng";
  return value.replaceAll("_", " ");
}

function StatusCard({ label, value }: { label: string; value: string }) {
  const healthy = value === "ok" || value.startsWith("000");

  return (
    <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-3 flex min-w-0 items-start gap-2">
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${healthy ? "bg-emerald-400" : "bg-amber-400"}`}
        />
        <p className="min-w-0 break-words text-sm font-semibold leading-6 text-slate-200" title={value}>
          {formatStatusValue(value)}
        </p>
      </div>
    </div>
  );
}
