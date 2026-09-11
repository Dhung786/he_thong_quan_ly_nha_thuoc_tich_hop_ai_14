import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { healthRequest } from "../lib/api";

const roleLabels: Record<string, string> = {
  MANAGER: "Quản lý",
  PHARMACIST: "Dược sĩ",
  CASHIER: "Thu ngân",
};

const plannedModules = [
  "UC003 · Quản lý lô nhập",
  "UC004 · Bán thuốc và lập hóa đơn",
  "UC005 · Quản lý nhà cung cấp",
  "UC006 · Quản lý và kiểm tra tồn kho",
  "UC007 · Tra cứu thuốc",
  "UC008 · Cảnh báo thuốc sắp hết hạn",
  "UC009 · Thống kê và báo cáo",
  "UC010–UC013 · AI hỗ trợ",
];

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthRequest,
    retry: false,
    refetchInterval: 30_000,
  });
  const roleLabel = roleLabels[auth.user?.role ?? ""] ?? auth.user?.role ?? "-";
  const canManageCatalog = auth.user?.role === "MANAGER";
  const canAdministerSystem = auth.user?.role === "MANAGER";

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-900/95 p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Pharmacy AI · Nhóm 14
            </p>
            <h1 className="mt-2 text-xl font-bold">Quản lý nhà thuốc</h1>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300 lg:mt-4 lg:inline-block">
            {roleLabel}
          </span>
        </div>

        <nav className="mt-8 space-y-2">
          <div className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950">
            Tổng quan
          </div>
          {canManageCatalog ? (
            <Link
              to="/catalog"
              className="block rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-950/60"
            >
              UC002 · Danh mục thuốc
            </Link>
          ) : (
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm text-slate-500"
              title="SRS UC002 chỉ định tác nhân Quản lý"
            >
              <span>UC002 · Danh mục thuốc</span>
              <span className="text-[10px] uppercase tracking-wider">Không có quyền</span>
            </div>
          )}
          {canAdministerSystem ? (
            <Link
              to="/admin"
              className="block rounded-xl border border-cyan-900/60 bg-cyan-950/30 px-4 py-3 text-sm font-medium text-cyan-300 transition hover:bg-cyan-950/60"
            >
              Quản trị hệ thống
            </Link>
          ) : null}
          {plannedModules.map((module) => (
            <div
              key={module}
              className="flex items-center justify-between rounded-xl border border-transparent px-4 py-3 text-sm text-slate-500"
            >
              <span>{module}</span>
              <span className="text-[10px] uppercase tracking-wider">Chưa triển khai</span>
            </div>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-5">
          <p className="text-sm font-medium text-slate-200">{auth.user?.username}</p>
          <p className="mt-1 text-xs text-slate-500">{roleLabel} · ID {auth.user?.id}</p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-red-800 hover:bg-red-950/30 hover:text-red-300"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="p-5 sm:p-8 lg:p-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">SRS V1.0 · Nhóm 14</p>
            <h2 className="mt-1 text-3xl font-bold">Hệ thống quản lý nhà thuốc có tích hợp AI</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Baseline nghiệp vụ đã chuyển sang SRS nhà thuốc. UC001 xác thực và UC002 danh mục
              thuốc đang hoạt động. Vai trò Quản lý có thêm khu vực quản trị hệ thống theo yêu cầu
              bổ sung đã được phê duyệt.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <span className="text-slate-500">Người dùng: </span>
            <span className="font-semibold text-slate-200">{auth.user?.username}</span>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Đã triển khai</p>
                <h3 className="mt-1 text-xl font-semibold">UC001 + UC002 + Quản trị hệ thống</h3>
              </div>
              <span className="rounded-full border border-emerald-800/70 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                PHARMACY BASELINE
              </span>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <CheckRow text="UC001: đăng nhập, xác định vai trò và phiên đăng nhập" />
              <CheckRow text="Ba vai trò: Quản lý, Dược sĩ, Thu ngân" />
              <CheckRow text="UC002: thêm, sửa, xóa, tra cứu thuốc" />
              <CheckRow text="UC002: quản lý nhóm thuốc và đơn vị tính" />
              {canAdministerSystem ? (
                <CheckRow text="Yêu cầu bổ sung: tạo/khóa tài khoản, phân vai trò, reset mật khẩu và xem audit log" />
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-500">Điểm cần giữ nguyên theo SRS</p>
            <h3 className="mt-1 text-xl font-semibold">Không tự suy diễn yêu cầu</h3>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Các trường dữ liệu chưa được SRS định nghĩa cụ thể sẽ chưa được thêm. Phần quản trị
              tài khoản được đánh dấu rõ là yêu cầu bổ sung sau SRS; các quyền UC003–UC013 vẫn chưa
              được tự suy diễn.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function formatStatusValue(value: string): string {
  if (value === "not_configured") return "Chưa cấu hình";
  if (value === "checking") return "Đang kiểm tra";
  if (value === "unavailable") return "Không khả dụng";
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

function CheckRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-950/60 px-4 py-3">
      <span className="mt-0.5 text-emerald-400">✓</span>
      <span>{text}</span>
    </div>
  );
}
