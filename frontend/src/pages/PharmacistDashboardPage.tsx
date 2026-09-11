import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { healthRequest } from "../lib/api";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";

export function PharmacistDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken ?? "";
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const health = useQuery({
    queryKey: ["health"],
    queryFn: healthRequest,
    retry: false,
    refetchInterval: 30_000,
  });

  const medicines = useQuery({
    queryKey: ["pharmacist-dashboard-medicines", searchQuery],
    queryFn: () => pharmacistMedicineLookupRequest(accessToken, searchQuery),
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  const medicineRows = medicines.data?.slice(0, 4) ?? [];
  const totalMedicines = medicines.isPending
    ? "…"
    : medicines.isError
      ? "—"
      : medicines.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#081528] text-slate-100 lg:grid lg:grid-cols-[265px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[82px] flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0b1a30] px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Xin chào, dược sĩ</h1>
            <p className="mt-1 text-sm text-slate-400">Vai trò hiện tại: Dược sĩ</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300">
              PHARMACIST
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-semibold transition hover:border-red-700 hover:text-red-300"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="space-y-5 p-4 sm:p-6 xl:p-7">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon="🔎" label="Thuốc có thể tra cứu" value={totalMedicines} note="Dữ liệu thật từ PostgreSQL" />
            <SummaryCard icon="📦" label="Lô sắp hết hạn" value="—" note="Chờ UC003 + UC008" accent="amber" />
            <SummaryCard icon="⚠️" label="Thuốc tồn thấp" value="—" note="Chờ UC006" accent="rose" />
            <SummaryCard icon="🧾" label="Yêu cầu hỗ trợ bán" value="—" note="Chờ UC004" accent="cyan" />
          </section>

          <section className="grid gap-5 2xl:grid-cols-[1.12fr_1fr]">
            <DashboardCard
              title="Tra cứu nhanh thuốc"
              icon="🔎"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/medicines">Xem tất cả →</Link>}
            >
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Nhập tên thuốc hoặc mã thuốc..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#0a1729] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  Tìm kiếm
                </button>
              </form>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Thuốc</th>
                      <th className="px-4 py-3">Mã</th>
                      <th className="px-4 py-3">Nhóm</th>
                      <th className="px-4 py-3">ĐVT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {medicineRows.map((medicine) => (
                      <tr key={medicine.id} className="text-slate-300">
                        <td className="px-4 py-3 font-semibold text-slate-100">{medicine.name}</td>
                        <td className="px-4 py-3">{medicine.code}</td>
                        <td className="px-4 py-3">{medicine.group_name}</td>
                        <td className="px-4 py-3">{medicine.unit_name}</td>
                      </tr>
                    ))}
                    {!medicines.isPending && medicineRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          Không tìm thấy thuốc phù hợp.
                        </td>
                      </tr>
                    )}
                    {medicines.isPending && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard
              title="Tồn kho & lô thuốc"
              icon="📦"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/inventory">Xem tất cả →</Link>}
            >
              <EmptyModule
                title="Chưa có API tồn kho/lô thuốc"
                description="Khu vực này sẽ hiển thị lô, số lượng, hạn dùng và trạng thái ngay khi UC003/UC006 được triển khai."
              />
            </DashboardCard>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <DashboardCard
              title="Cảnh báo"
              icon="⚠️"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/alerts">Xem tất cả →</Link>}
            >
              <EmptyModule
                title="Chưa có cảnh báo nghiệp vụ"
                description="Thuốc tồn thấp và lô sắp hết hạn sẽ xuất hiện tại đây từ dữ liệu backend thật."
                compact
              />
            </DashboardCard>

            <DashboardCard
              title="Hỗ trợ bán thuốc"
              icon="🧾"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/sales-support">Mở chức năng →</Link>}
            >
              <div className="grid grid-cols-3 gap-2 text-xs">
                <MiniAction label="Kiểm tra tồn" />
                <MiniAction label="Tra cứu thuốc" />
                <MiniAction label="Tư vấn bán" />
              </div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                <p className="font-semibold text-slate-200">UC004 đang chờ hoàn thiện</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Chưa tạo hóa đơn hoặc trừ tồn cho tới khi quy tắc chọn lô và permission bán thuốc được chốt đầy đủ.
                </p>
              </div>
            </DashboardCard>

            <DashboardCard
              title="AI Dược sĩ"
              icon="🤖"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/ai">Mở AI →</Link>}
            >
              <textarea
                disabled
                placeholder="Hỏi AI về thuốc, tương tác, bảo quản hoặc quy trình..."
                className="h-24 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/30 p-3 text-sm placeholder:text-slate-600 disabled:cursor-not-allowed"
              />
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span className="rounded-lg border border-slate-700 px-2.5 py-1.5">Tóm tắt thông tin thuốc</span>
                <span className="rounded-lg border border-slate-700 px-2.5 py-1.5">Tương tác cần lưu ý</span>
                <span className="rounded-lg border border-slate-700 px-2.5 py-1.5">Quy trình bảo quản</span>
              </div>
              <Link
                to="/pharmacist/ai"
                className="mt-4 block rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-center text-sm font-bold text-white"
              >
                Hỏi AI
              </Link>
            </DashboardCard>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr_0.9fr]">
            <DashboardCard
              title="Quy trình nội bộ"
              icon="📚"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/process">Xem tất cả →</Link>}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ProcessTile icon="📄" title="Quy trình bán thuốc" />
                <ProcessTile icon="⏱️" title="Xử lý thuốc sắp hết hạn" />
                <ProcessTile icon="📦" title="Quy trình kiểm kê" />
                <ProcessTile icon="👤" title="Tiếp nhận đơn" />
              </div>
            </DashboardCard>

            <DashboardCard
              title="Báo cáo"
              icon="📈"
              action={<Link className="text-xs font-semibold text-cyan-300 hover:text-cyan-200" to="/pharmacist/reports">Xem tất cả →</Link>}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <ReportTile label="Thuốc sắp hết hạn" value="—" note="Chờ UC008/UC009" />
                <ReportTile label="Thuốc có thể tra cứu" value={totalMedicines} note="Dữ liệu UC007" />
              </div>
            </DashboardCard>

            <DashboardCard title="Hồ sơ" icon="⚙️">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 text-3xl">👤</div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{auth.user?.username}</p>
                  <p className="text-sm text-slate-400">Dược sĩ</p>
                  <p className="mt-1 text-xs text-slate-600">MediCare AI</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link to="/pharmacist/profile" className="rounded-xl border border-cyan-600/50 px-3 py-2 text-center text-xs font-semibold text-cyan-300">Xem hồ sơ</Link>
                <Link to="/pharmacist/profile" className="rounded-xl border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300">Đổi mật khẩu</Link>
              </div>
            </DashboardCard>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3 text-xs text-slate-500">
            Core: <strong className="text-slate-300">{formatStatus(health.data?.core)}</strong>
            {" · "}PostgreSQL: <strong className="text-slate-300">{formatStatus(health.data?.database)}</strong>
            {" · "}Migration: <strong className="text-slate-300">{formatStatus(health.data?.migration)}</strong>
            {" · "}AI: <strong className="text-slate-300">{formatStatus(health.data?.ai)}</strong>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  note,
  accent = "default",
}: {
  icon: string;
  label: string;
  value: string | number;
  note: string;
  accent?: "default" | "amber" | "rose" | "cyan";
}) {
  const valueClass =
    accent === "amber"
      ? "text-amber-300"
      : accent === "rose"
        ? "text-rose-400"
        : accent === "cyan"
          ? "text-cyan-300"
          : "text-white";

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-4 shadow-xl shadow-slate-950/10">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950/35 text-xl">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className={`mt-1 text-3xl font-black ${valueClass}`}>{value}</p>
          <p className="mt-1 text-[11px] text-slate-600">{note}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#102238] p-4 shadow-xl shadow-slate-950/10 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <h2 className="font-bold text-slate-100">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyModule({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-5 text-center ${compact ? "min-h-36 py-5" : "min-h-52 py-7"}`}>
      <div>
        <p className="font-semibold text-slate-300">{title}</p>
        <p className="mt-2 max-w-lg text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function MiniAction({ label }: { label: string }) {
  return <span className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 px-2 py-2 text-center font-semibold text-cyan-300">{label}</span>;
}

function ProcessTile({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-3">
      <span className="text-lg">{icon}</span>
      <p className="mt-2 text-xs font-semibold text-slate-300">{title}</p>
    </div>
  );
}

function ReportTile({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-cyan-300">{value}</p>
      <p className="mt-2 text-[11px] text-slate-600">{note}</p>
    </div>
  );
}

function formatStatus(value?: string): string {
  if (!value) return "đang kiểm tra";
  if (value === "not_configured") return "chưa cấu hình";
  return value.replaceAll("_", " ");
}
