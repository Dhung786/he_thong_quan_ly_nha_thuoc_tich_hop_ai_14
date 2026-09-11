import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { healthRequest } from "../lib/api";

const futureModules = [
  "Nhóm hàng & ĐVT",
  "Hàng hóa",
  "Nhà cung cấp",
  "Nhập kho",
  "Xuất kho",
  "Tồn kho",
  "Báo cáo",
  "AI hỗ trợ",
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

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-900/95 p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between lg:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Warehouse AI
            </p>
            <h1 className="mt-2 text-xl font-bold">Quản lý kho</h1>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300 lg:mt-4 lg:inline-block">
            {auth.user?.role ?? "-"}
          </span>
        </div>

        <nav className="mt-8 space-y-2">
          <div className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950">
            Tổng quan
          </div>
          {futureModules.map((module) => (
            <div
              key={module}
              className="flex items-center justify-between rounded-xl border border-transparent px-4 py-3 text-sm text-slate-500"
              title="Chờ baseline và Permission Matrix được phê duyệt"
            >
              <span>{module}</span>
              <span className="text-[10px] uppercase tracking-wider">Chưa mở</span>
            </div>
          ))}
        </nav>

        <div className="mt-8 border-t border-slate-800 pt-5">
          <p className="text-sm font-medium text-slate-200">{auth.user?.username}</p>
          <p className="mt-1 text-xs text-slate-500">ID: {auth.user?.id}</p>
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
            <p className="text-sm text-slate-400">Dashboard</p>
            <h2 className="mt-1 text-3xl font-bold">Tổng quan hệ thống</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Authentication đã hoạt động với backend thật. Các chức năng nghiệp vụ sẽ được mở
              khi schema và Permission Matrix có nguồn phê duyệt.
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
                <p className="text-sm text-slate-500">Trạng thái triển khai</p>
                <h3 className="mt-1 text-xl font-semibold">Phase 2B technical readiness</h3>
              </div>
              <span className="rounded-full border border-amber-800/70 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-300">
                PARTIAL / BLOCKED
              </span>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-300">
              <CheckRow text="Authentication + refresh rotation + logout" />
              <CheckRow text="Audit, correlation ID và structured logging" />
              <CheckRow text="Idempotency, transaction boundary và PostgreSQL row lock" />
              <CheckRow text="Migration, backup/restore và clean Compose smoke test" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-500">Điều kiện mở nghiệp vụ</p>
            <h3 className="mt-1 text-xl font-semibold">Cần nguồn phê duyệt</h3>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Data Dictionary, Use Case và ma trận ROLE × FR × ACTION × API phải được xác định
              trước khi bật các module kho. Dashboard không tự suy diễn quyền của từng role.
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
