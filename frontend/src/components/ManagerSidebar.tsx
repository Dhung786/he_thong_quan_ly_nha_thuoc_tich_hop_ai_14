import { NavLink } from "react-router-dom";

const managerNavItems = [
  { to: "/dashboard", icon: "📊", label: "Tổng quan / Dashboard", end: true },
  { to: "/catalog", icon: "💊", label: "Quản lý thuốc" },
  { to: "/manager/imports", icon: "📥", label: "Quản lý nhập thuốc" },
  { to: "/manager/sales", icon: "🧾", label: "Bán thuốc" },
  { to: "/manager/inventory", icon: "📦", label: "Tồn kho" },
  { to: "/manager/expiry", icon: "⏳", label: "Hạn sử dụng" },
  { to: "/manager/lookup", icon: "🔎", label: "Tra cứu thuốc" },
  { to: "/manager/reports", icon: "📈", label: "Báo cáo - Thống kê" },
  { to: "/manager/ai", icon: "🤖", label: "Trợ lý AI" },
  { to: "/manager/users", icon: "👥", label: "Tài khoản / Phân quyền" },
];

export function ManagerSidebar() {
  return (
    <aside className="relative overflow-hidden border-b border-slate-800/80 bg-[#06101e] px-4 py-6 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 shadow-lg shadow-black/10">
        <div className="grid h-12 w-12 rotate-[-35deg] place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 shadow-lg shadow-cyan-950/30">
          <span className="rotate-[35deg] text-xl">💊</span>
        </div>
        <div>
          <p className="text-xl font-black tracking-tight text-cyan-300">MediCare AI</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Manager Workspace</p>
        </div>
      </div>

      <nav className="relative z-10 mt-8 space-y-1.5">
        {managerNavItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-sky-500/5 text-cyan-200 shadow-[0_10px_30px_rgba(6,182,212,.08)]"
                  : "border-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.04] hover:text-slate-100"
              }`
            }
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-base transition group-hover:bg-white/[0.07]" aria-hidden="true">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 leading-5">{index + 1}. {item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
