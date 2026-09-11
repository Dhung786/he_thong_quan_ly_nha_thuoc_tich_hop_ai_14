import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";
import { healthRequest } from "../lib/api";
import { pharmacistMedicineLookupRequest } from "../lib/pharmacist-api";

export function PharmacistDashboardCleanPage() {
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
    queryKey: ["pharmacist-dashboard-clean-medicines"],
    queryFn: () => pharmacistMedicineLookupRequest(accessToken, ""),
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

  const aiConfigured = health.data?.ai === "configured";

  return (
    <div className="min-h-screen bg-[#081528] text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <PharmacistSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[82px] flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0b1a30] px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-2xl font-black sm:text-3xl">Xin chào, {auth.user?.username}</h1>
            <p className="mt-1 text-sm text-slate-400">Không gian làm việc dành cho Dược sĩ</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300">PHARMACIST</span>
            <button type="button" onClick={() => void handleLogout()} className="rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-sm font-semibold transition hover:border-red-700 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="space-y-6 p-5 sm:p-7 lg:p-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Thuốc có thể tra cứu" value={totalMedicines} note="Dữ liệu thật từ PostgreSQL" />
            <SummaryCard label="Thuốc tồn thấp" value="—" note="Chưa có dữ liệu tồn kho" accent="amber" />
            <SummaryCard label="Lô sắp hết hạn" value="—" note="Chưa có dữ liệu hạn sử dụng" accent="rose" />
            <SummaryCard label="AI Dược sĩ" value={aiConfigured ? "Sẵn sàng" : "Chưa cấu hình"} note="Không tạo phản hồi giả" accent="cyan" />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <FeatureCard title="🔎 Tra cứu thuốc" to="/pharmacist/medicines" status="Đã có dữ liệu thật">
              Tìm thuốc theo tên hoặc mã và xem thông tin danh mục đã lưu trong hệ thống.
            </FeatureCard>
            <FeatureCard title="📦 Tồn kho & lô thuốc" to="/pharmacist/inventory" status="Đang chờ API">
              Theo dõi tồn hiện tại, ngưỡng tối thiểu, lô thuốc và hạn sử dụng.
            </FeatureCard>
            <FeatureCard title="🏢 Nhà cung cấp" to="/pharmacist/suppliers" status="Đang chờ API">
              Tra cứu và cập nhật thông tin nhà cung cấp theo quyền được cấp.
            </FeatureCard>
            <FeatureCard title="⚠️ Cảnh báo" to="/pharmacist/alerts" status="Đang chờ API">
              Xem thuốc tồn thấp, thuốc hết hàng, lô sắp hết hạn và lô đã hết hạn.
            </FeatureCard>
            <FeatureCard title="🧾 Hỗ trợ bán thuốc" to="/pharmacist/sales-support" status="Đang chờ API">
              Kiểm tra tồn, tra cứu thuốc và chuẩn bị thông tin hỗ trợ bán thuốc.
            </FeatureCard>
            <FeatureCard title="🤖 AI Dược sĩ" to="/pharmacist/ai" status={aiConfigured ? "AI đã cấu hình" : "AI chưa cấu hình"}>
              Tóm tắt thông tin thuốc, tham khảo báo cáo hạn dùng và hỗ trợ hỏi đáp.
            </FeatureCard>
            <FeatureCard title="📚 Quy trình nội bộ" to="/pharmacist/process" status="Đang chờ dữ liệu nội bộ">
              Tra cứu quy trình bán thuốc, kiểm kê và xử lý thuốc hết hạn.
            </FeatureCard>
            <FeatureCard title="📈 Báo cáo" to="/pharmacist/reports" status="Đang chờ API">
              Xem báo cáo tồn kho, thuốc tồn thấp và thuốc sắp hết hạn.
            </FeatureCard>
            <FeatureCard title="⚙️ Hồ sơ" to="/pharmacist/profile" status="Đang chờ API hồ sơ">
              Xem thông tin tài khoản, vai trò và đổi mật khẩu.
            </FeatureCard>
          </section>

          <section className="rounded-3xl border border-slate-700/70 bg-[#12243b] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Tra cứu nhanh</h2>
                <p className="mt-1 text-sm text-slate-500">Danh sách một số thuốc hiện có trong hệ thống.</p>
              </div>
              <Link to="/pharmacist/medicines" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Mở tra cứu đầy đủ →</Link>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Thuốc</th><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Nhóm</th><th className="px-4 py-3">Đơn vị tính</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(medicines.data ?? []).slice(0, 5).map((medicine) => (
                    <tr key={medicine.id} className="text-slate-300">
                      <td className="px-4 py-3 font-semibold text-slate-100">{medicine.name}</td>
                      <td className="px-4 py-3">{medicine.code}</td>
                      <td className="px-4 py-3">{medicine.group_name}</td>
                      <td className="px-4 py-3">{medicine.unit_name}</td>
                    </tr>
                  ))}
                  {!medicines.isPending && (medicines.data?.length ?? 0) === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Chưa có thuốc để hiển thị.</td></tr>
                  )}
                  {medicines.isPending && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, note, accent = "default" }: { label: string; value: string | number; note: string; accent?: "default" | "amber" | "rose" | "cyan" }) {
  const valueClass = accent === "amber" ? "text-amber-300" : accent === "rose" ? "text-rose-400" : accent === "cyan" ? "text-cyan-300" : "text-white";
  return <div className="rounded-2xl border border-slate-700/70 bg-[#12243b] p-5"><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${valueClass}`}>{value}</p><p className="mt-2 text-xs text-slate-600">{note}</p></div>;
}

function FeatureCard({ title, to, status, children }: { title: string; to: string; status: string; children: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-slate-700/70 bg-[#12243b] p-5 transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:bg-[#162a45]">
      <div className="flex items-start justify-between gap-4"><h2 className="font-bold group-hover:text-cyan-300">{title}</h2><span className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-1 text-[11px] text-slate-400">{status}</span></div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{children}</p>
      <p className="mt-4 text-sm font-semibold text-cyan-300">Mở chức năng →</p>
    </Link>
  );
}
