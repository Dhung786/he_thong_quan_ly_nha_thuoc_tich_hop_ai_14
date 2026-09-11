import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { healthRequest } from "../lib/api";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";

export function PharmacistDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken ?? "";

  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthRequest,
    retry: false,
    refetchInterval: 30_000,
  });

  const medicines = useQuery({
    queryKey: ["pharmacist-medicines-summary"],
    queryFn: () => pharmacistMedicineLookupRequest(accessToken),
    enabled: auth.user?.role === "PHARMACIST" && Boolean(accessToken),
    retry: false,
  });

  if (auth.user?.role !== "PHARMACIST") {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  const totalMedicines = medicines.isPending
    ? "…"
    : medicines.isError
      ? "—"
      : medicines.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400 sm:hidden">
              MediCare AI
            </p>
            <h1 className="text-xl font-bold sm:text-2xl">Tổng quan Dược sĩ</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-300">Dược sĩ</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs font-semibold text-emerald-300">
              PHARMACIST
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
              label="Thuốc có thể tra cứu"
              value={totalMedicines}
              note="Dữ liệu thật từ PostgreSQL"
            />
            <MetricCard
              label="Tra cứu thuốc"
              value="UC007"
              note="Read-only, không sửa danh mục"
            />
            <MetricCard
              label="Hỗ trợ bán thuốc"
              value="—"
              note="Chờ backend UC004"
              accent="amber"
            />
            <MetricCard
              label="AI Dược sĩ"
              value={health.data?.ai === "configured" ? "Sẵn sàng" : "Chưa cấu hình"}
              note="UC010–UC013 có Scope Guard"
              accent="emerald"
            />
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 sm:p-7">
              <p className="text-sm font-semibold text-emerald-300">Không gian làm việc Dược sĩ</p>
              <h2 className="mt-2 text-2xl font-bold">Thuốc, bán thuốc và thông tin tham khảo</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Dược sĩ được tra cứu thông tin thuốc từ dữ liệu hệ thống, hỗ trợ quy trình bán thuốc và sử dụng các chức năng AI để tham khảo thông tin thuốc và quy trình nội bộ. Quyền chỉnh sửa danh mục thuốc vẫn thuộc Quản lý.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <QuickAction
                  to="/pharmacist/medicines"
                  icon="🔎"
                  title="Tra cứu thuốc"
                  description="Tìm theo mã hoặc tên thuốc, dữ liệu chỉ đọc từ PostgreSQL."
                />
                <QuickAction
                  to="/pharmacist/sales-support"
                  icon="🧾"
                  title="Hỗ trợ bán thuốc"
                  description="Khu vực chuẩn bị cho UC004, chưa ghi hóa đơn khi backend chưa hoàn tất."
                />
                <QuickAction
                  to="/pharmacist/ai"
                  icon="🤖"
                  title="AI Dược sĩ"
                  description="Tham khảo thông tin thuốc; không chẩn đoán hoặc kê đơn tự động."
                />
                <QuickAction
                  to="/pharmacist/process"
                  icon="📚"
                  title="Quy trình nội bộ"
                  description="Khu vực hỏi đáp quy trình nội bộ theo UC012."
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 sm:p-7">
              <h2 className="text-lg font-bold">Trạng thái hệ thống</h2>
              <div className="mt-5 space-y-3">
                <StatusRow label="Core" value={health.data?.core ?? "checking"} />
                <StatusRow label="PostgreSQL" value={health.data?.database ?? "checking"} />
                <StatusRow label="Migration" value={health.data?.migration ?? "checking"} />
                <StatusRow label="AI provider" value={health.data?.ai ?? "checking"} />
              </div>
            </div>
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
    <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${valueClass}`}>{value}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-slate-700 bg-slate-950/25 p-5 transition hover:border-emerald-500/50 hover:bg-slate-950/40"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  const ok = value === "ok" || value.startsWith("000") || value === "configured";
  const formatted = value.replaceAll("_", " ");
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/30 px-4 py-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={ok ? "font-semibold text-emerald-300" : "font-semibold text-amber-300"}>
        {formatted}
      </span>
    </div>
  );
}
