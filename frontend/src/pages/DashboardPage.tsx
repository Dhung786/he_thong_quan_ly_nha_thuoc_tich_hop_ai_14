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

const managerModules = [
  {
    number: "01",
    icon: "📊",
    title: "Tổng quan / Dashboard",
    description: "Theo dõi tổng số thuốc, tồn thấp và thuốc sắp hết hạn.",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Tổng số thuốc", to: "/manager/overview/medicines" },
      { label: "Thuốc tồn thấp", to: "/manager/overview/low-stock" },
      { label: "Thuốc sắp hết hạn", to: "/manager/overview/expiry" },
    ],
  },
  {
    number: "02",
    icon: "💊",
    title: "Quản lý thuốc",
    description: "Danh sách thuốc, nhóm thuốc và đơn vị tính.",
    links: [
      { label: "Danh sách thuốc", to: "/catalog" },
      { label: "Nhóm thuốc", to: "/manager/medicine-groups" },
      { label: "Đơn vị tính", to: "/manager/units" },
    ],
  },
  {
    number: "03",
    icon: "📦",
    title: "Quản lý nhập thuốc",
    description: "Quản lý lô nhập và nhà cung cấp.",
    links: [
      { label: "Danh sách lô nhập", to: "/manager/imports" },
      { label: "Thêm lô nhập", to: "/manager/imports/new" },
      { label: "Nhà cung cấp", to: "/manager/suppliers" },
    ],
  },
  {
    number: "04",
    icon: "🧾",
    title: "Bán thuốc",
    description: "Khu vực bán thuốc và quản lý hóa đơn.",
    links: [
      { label: "Bán thuốc", to: "/manager/sales" },
      { label: "Hóa đơn", to: "/manager/invoices" },
    ],
  },
  {
    number: "05",
    icon: "📚",
    title: "Tồn kho",
    description: "Danh sách tồn kho và cảnh báo tồn thấp.",
    links: [
      { label: "Danh sách tồn kho", to: "/manager/inventory" },
      { label: "Cảnh báo tồn thấp", to: "/manager/low-stock" },
    ],
  },
  {
    number: "06",
    icon: "⏳",
    title: "Hạn sử dụng",
    description: "Theo dõi thuốc sắp hết hạn và đã hết hạn.",
    links: [
      { label: "Thuốc sắp hết hạn", to: "/manager/expiry-soon" },
      { label: "Thuốc đã hết hạn", to: "/manager/expired" },
    ],
  },
  {
    number: "07",
    icon: "🔎",
    title: "Tra cứu thuốc",
    description: "Tra cứu nhanh thông tin thuốc trong hệ thống.",
    links: [{ label: "Mở tra cứu thuốc", to: "/manager/lookup" }],
  },
  {
    number: "08",
    icon: "📈",
    title: "Báo cáo - Thống kê",
    description: "Theo dõi doanh thu, tồn kho và hạn sử dụng.",
    links: [
      { label: "Doanh thu", to: "/manager/reports/revenue" },
      { label: "Tồn kho", to: "/manager/reports/inventory" },
      { label: "Thuốc sắp hết hạn", to: "/manager/reports/expiry" },
    ],
  },
  {
    number: "09",
    icon: "🤖",
    title: "Trợ lý AI",
    description: "Tóm tắt thuốc, báo cáo hạn dùng và chatbot quy trình nội bộ.",
    links: [
      { label: "AI tóm tắt thông tin thuốc", to: "/manager/ai/medicine-summary" },
      { label: "AI báo cáo thuốc sắp hết hạn", to: "/manager/ai/expiry-report" },
      { label: "Chatbot quy trình nội bộ", to: "/manager/ai/process-chat" },
    ],
  },
  {
    number: "10",
    icon: "🔐",
    title: "Tài khoản / Phân quyền",
    description: "Quản lý tài khoản và phạm vi quyền trong hệ thống.",
    links: [
      { label: "Tài khoản & phân quyền", to: "/manager/accounts" },
      { label: "Hồ sơ quản lý", to: "/manager/profile" },
    ],
  },
];

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

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            Không gian quản lý chỉ dành cho vai trò MANAGER.
          </div>
        </div>
      </main>
    );
  }

  const totalMedicines = medicines.isPending
    ? "…"
    : medicines.isError
      ? "—"
      : medicines.data?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[340px_1fr]">
      <ManagerSidebar />

      <div className="min-w-0">
        <header className="flex min-h-[88px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">MediCare AI</p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">Không gian Quản lý</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-200">Quản lý</p>
              <p className="text-xs text-slate-500">{auth.user?.username}</p>
            </div>
            <span className="rounded-xl border border-sky-700/60 bg-sky-900/20 px-3 py-2 text-xs font-bold text-sky-300">
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
              icon="💊"
              label="Tổng số thuốc"
              value={totalMedicines}
              note={medicines.isError ? "Không tải được UC002" : "Dữ liệu thật từ PostgreSQL"}
            />
            <MetricCard icon="📦" label="Tổng tồn kho" value="—" note="Chờ UC003 + UC006" />
            <MetricCard icon="⚠️" label="Thuốc tồn thấp" value="—" note="Chờ dữ liệu tồn kho" accent="amber" />
            <MetricCard icon="⏳" label="Thuốc sắp hết hạn" value="—" note="Chờ UC008" accent="rose" />
          </section>

          <section className="mt-7 rounded-3xl border border-slate-700/70 bg-[#152238] p-6 shadow-xl shadow-slate-950/20 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-300">Cây chức năng Quản lý</p>
                <h2 className="mt-1 text-2xl font-bold">10 nhóm chức năng chính</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  Giao diện được tổ chức theo đúng cấu trúc bạn cung cấp. Các module chưa có backend thật chỉ mở giao diện trạng thái, không hiển thị dữ liệu nghiệp vụ giả.
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-2 text-xs text-slate-400">
                Core: <strong className="text-slate-200">{formatStatusValue(health.data?.core ?? "checking")}</strong>
                {" · "}DB: <strong className="text-slate-200">{formatStatusValue(health.data?.database ?? "checking")}</strong>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {managerModules.map((module) => (
                <ModuleCard key={module.number} {...module} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
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
  accent?: "default" | "amber" | "rose";
}) {
  const valueClass =
    accent === "amber" ? "text-amber-400" : accent === "rose" ? "text-rose-400" : "text-slate-50";

  return (
    <div className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-6 shadow-xl shadow-slate-950/10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="text-2xl" aria-hidden="true">{icon}</span>
      </div>
      <p className={`mt-3 text-3xl font-black ${valueClass}`}>{value}</p>
      <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
    </div>
  );
}

function ModuleCard({
  number,
  icon,
  title,
  description,
  links,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
  links: { label: string; to: string }[];
}) {
  return (
    <article className="rounded-2xl border border-slate-700/70 bg-slate-950/20 p-5 transition hover:border-sky-500/40 hover:bg-slate-950/30">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-xl ring-1 ring-sky-500/20">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[0.18em] text-sky-400">MODULE {number}</p>
          <h3 className="mt-1 font-bold text-slate-100">{title}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-4 space-y-1.5 border-l border-slate-700 pl-3">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="block rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-sky-500/10 hover:text-sky-300"
          >
            <span className="mr-2 text-slate-600">└</span>{link.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

function formatStatusValue(value: string): string {
  if (value === "not_configured") return "chưa cấu hình";
  if (value === "checking") return "đang kiểm tra";
  if (value === "unavailable") return "không khả dụng";
  return value.replaceAll("_", " ");
}
