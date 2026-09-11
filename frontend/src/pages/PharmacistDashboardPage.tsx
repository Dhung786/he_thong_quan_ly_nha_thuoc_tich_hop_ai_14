import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { demoMedicinePrice, formatVnd, pharmacistDemoMetrics } from "../lib/demo-data";
import { healthRequest } from "../lib/api";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";

const demoLots = [
  ["Amoxicillin 500mg", "LO-260901", "35", "30/06/2027", "Tồn thấp"],
  ["Paracetamol 500mg", "LO-260902", "86", "15/03/2027", "An toàn"],
  ["Siro ho thảo dược", "LO-260815", "18", "20/10/2026", "Sắp hết hạn"],
];

const demoAlerts = [
  "Amoxicillin 500mg còn 35 hộp, thấp hơn ngưỡng 40",
  "Siro ho thảo dược còn 38 ngày trước hạn sử dụng",
  "Vitamin C 500mg nằm trong nhóm cần theo dõi hạn dùng",
];

export function PharmacistDashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const accessToken = auth.accessToken ?? "";
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const health = useQuery({ queryKey: ["health"], queryFn: healthRequest, retry: false, refetchInterval: 30_000 });
  const medicines = useQuery({
    queryKey: ["pharmacist-dashboard-medicines", searchQuery],
    queryFn: () => pharmacistMedicineLookupRequest(accessToken, searchQuery),
    enabled: auth.user?.role === "PHARMACIST" && Boolean(accessToken),
    retry: false,
  });

  if (auth.user?.role !== "PHARMACIST") return <Navigate to="/dashboard" replace />;

  async function handleLogout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  const medicineRows = medicines.data?.slice(0, 5) ?? [];
  const totalMedicines = medicines.isPending ? "…" : medicines.isError ? "—" : medicines.data?.length ?? 0;

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
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300">PHARMACIST</span>
            <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>

        <main className="space-y-5 p-4 sm:p-6 xl:p-7">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 font-bold text-violet-300">DEMO</span>
            <span className="text-slate-500">Tồn kho, hạn dùng, cảnh báo và hỗ trợ bán bên dưới là số liệu minh họa.</span>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon="🔎" label="Thuốc có thể tra cứu" value={totalMedicines} note="Dữ liệu thật từ PostgreSQL" />
            <SummaryCard icon="📦" label="Lô sắp hết hạn" value={pharmacistDemoMetrics.expiringLots} note="Trong 90 ngày tới · Demo" accent="amber" demo />
            <SummaryCard icon="⚠️" label="Thuốc tồn thấp" value={pharmacistDemoMetrics.lowStockMedicines} note={`${pharmacistDemoMetrics.alertsToday} cảnh báo hôm nay · Demo`} accent="rose" demo />
            <SummaryCard icon="🧾" label="Yêu cầu hỗ trợ bán" value={pharmacistDemoMetrics.salesSupportRequests} note="Ca làm việc hiện tại · Demo" accent="cyan" demo />
          </section>

          <section className="grid gap-5 2xl:grid-cols-[1.2fr_1fr]">
            <DashboardCard title="Tra cứu nhanh thuốc" icon="🔎" action={<Link className="text-xs font-semibold text-cyan-300" to="/pharmacist/medicines">Xem tất cả →</Link>}>
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nhập tên thuốc hoặc mã thuốc..." className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#0a1729] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500" />
                <button type="submit" className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">Tìm kiếm</button>
              </form>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-3">Thuốc</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">ĐVT</th><th className="px-4 py-3">Giá bán demo</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {medicineRows.map((medicine) => (
                      <tr key={medicine.id} className="text-slate-300">
                        <td className="px-4 py-3 font-semibold text-slate-100">{medicine.name}</td>
                        <td className="px-4 py-3">{medicine.code}</td>
                        <td className="px-4 py-3">{medicine.group_name}</td>
                        <td className="px-4 py-3">{medicine.unit_name}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-300">{formatVnd(demoMedicinePrice(medicine.id))}</td>
                      </tr>
                    ))}
                    {!medicines.isPending && medicineRows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Không tìm thấy thuốc phù hợp.</td></tr>}
                    {medicines.isPending && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard title="Tồn kho & lô thuốc" icon="📦" action={<Link className="text-xs font-semibold text-cyan-300" to="/pharmacist/inventory">Xem tất cả →</Link>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Thuốc</th><th className="pb-3">Lô</th><th className="pb-3">Tồn</th><th className="pb-3">HSD</th><th className="pb-3">Trạng thái</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">{demoLots.map((row) => <tr key={row[1]}>{row.map((cell, index) => <td key={index} className="py-3 pr-3 text-slate-300">{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-violet-300">Dữ liệu demo</p>
            </DashboardCard>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <DashboardCard title="Cảnh báo" icon="⚠️" action={<Link className="text-xs font-semibold text-cyan-300" to="/pharmacist/alerts">Xem tất cả →</Link>}>
              <div className="space-y-3">{demoAlerts.map((alert) => <div key={alert} className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-sm text-slate-300">⚠️ {alert}</div>)}</div>
            </DashboardCard>

            <DashboardCard title="Hỗ trợ bán thuốc" icon="🧾" action={<Link className="text-xs font-semibold text-cyan-300" to="/pharmacist/sales-support">Mở chức năng →</Link>}>
              <div className="space-y-3 text-sm">
                <DemoSale name="Paracetamol 500mg" stock="86 hộp" price="15.000 đ" />
                <DemoSale name="Vitamin C 500mg" stock="64 hộp" price="32.000 đ" />
                <DemoSale name="Amoxicillin 500mg" stock="35 hộp" price="25.000 đ" />
              </div>
            </DashboardCard>

            <DashboardCard title="AI Dược sĩ" icon="🤖" action={<Link className="text-xs font-semibold text-cyan-300" to="/pharmacist/ai">Mở AI →</Link>}>
              <textarea disabled placeholder="Hỏi AI về thuốc, tương tác, bảo quản hoặc quy trình..." className="h-24 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/30 p-3 text-sm placeholder:text-slate-600" />
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400"><span className="rounded-lg border border-slate-700 px-2.5 py-1.5">Tóm tắt thông tin thuốc</span><span className="rounded-lg border border-slate-700 px-2.5 py-1.5">Báo cáo hạn dùng</span><span className="rounded-lg border border-slate-700 px-2.5 py-1.5">Quy trình nội bộ</span></div>
            </DashboardCard>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <QuickLink icon="📚" title="Quy trình nội bộ" to="/pharmacist/process" text="Bán thuốc · Kiểm kê · Xử lý thuốc hết hạn" />
            <QuickLink icon="📈" title="Báo cáo" to="/pharmacist/reports" text="615 đơn vị tồn · 5 thuốc tồn thấp · 7 lô sắp hết hạn (demo)" />
            <QuickLink icon="⚙️" title="Hồ sơ" to="/pharmacist/profile" text={`${auth.user?.username ?? "pharmacist"} · Dược sĩ · Đang hoạt động`} />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950/25 px-4 py-3 text-xs text-slate-500">Core: <strong className="text-slate-300">{formatStatus(health.data?.core)}</strong>{" · "} PostgreSQL: <strong className="text-slate-300">{formatStatus(health.data?.database)}</strong>{" · "} Migration: <strong className="text-slate-300">{formatStatus(health.data?.migration)}</strong>{" · "} AI: <strong className="text-slate-300">{formatStatus(health.data?.ai)}</strong></section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, note, accent = "default", demo = false }: { icon: string; label: string; value: string | number; note: string; accent?: "default" | "amber" | "rose" | "cyan"; demo?: boolean }) {
  const valueClass = accent === "amber" ? "text-amber-300" : accent === "rose" ? "text-rose-400" : accent === "cyan" ? "text-cyan-300" : "text-white";
  return <div className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-4"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950/35 text-xl">{icon}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-sm text-slate-400">{label}</p>{demo && <span className="text-[9px] font-bold text-violet-300">DEMO</span>}</div><p className={`mt-1 text-3xl font-black ${valueClass}`}>{value}</p><p className="mt-1 text-[11px] text-slate-600">{note}</p></div></div></div>;
}

function DashboardCard({ title, icon, action, children }: { title: string; icon: string; action?: ReactNode; children: ReactNode }) {
  return <div className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold"><span className="mr-2">{icon}</span>{title}</h2>{action}</div>{children}</div>;
}

function DemoSale({ name, stock, price }: { name: string; stock: string; price: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/25 p-3"><div><p className="font-semibold text-slate-200">{name}</p><p className="mt-1 text-xs text-slate-500">Tồn: {stock}</p></div><p className="font-bold text-emerald-300">{price}</p></div>;
}

function QuickLink({ icon, title, to, text }: { icon: string; title: string; to: string; text: string }) {
  return <Link to={to} className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-5 transition hover:border-cyan-500/40"><h2 className="font-bold"><span className="mr-2">{icon}</span>{title}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p><p className="mt-4 text-xs font-semibold text-cyan-300">Mở chức năng →</p></Link>;
}

function formatStatus(value?: string): string {
  if (!value) return "đang kiểm tra";
  if (value === "not_configured") return "chưa cấu hình";
  return value.replaceAll("_", " ");
}
