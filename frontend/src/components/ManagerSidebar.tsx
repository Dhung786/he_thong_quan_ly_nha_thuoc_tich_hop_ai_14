import { NavLink } from "react-router-dom";

const managerNavItems = [
  { to: "/dashboard", icon: "📊", label: "Dashboard", end: true },
  { to: "/catalog", icon: "💊", label: "Thuốc" },
  { to: "/manager/sales", icon: "🧾", label: "Bán thuốc" },
  { to: "/manager/inventory", icon: "📦", label: "Kho thuốc" },
  { to: "/manager/alerts", icon: "⚠️", label: "Cảnh báo" },
  { to: "/manager/customers", icon: "👥", label: "Khách hàng" },
  { to: "/manager/reports", icon: "📈", label: "Báo cáo" },
  { to: "/manager/ai", icon: "🤖", label: "AI Dược sĩ" },
  { to: "/manager/users", icon: "👤", label: "Người dùng" },
  { to: "/manager/audit", icon: "🔐", label: "Audit Log" },
  { to: "/manager/profile", icon: "⚙️", label: "Hồ sơ" },
];

export function ManagerSidebar() {
  return (
    <aside className="border-b border-slate-800 bg-[#07101f] px-4 py-6 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 rotate-[-40deg] place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-950/30">
          <span className="rotate-[40deg] text-xl">💊</span>
        </div>
        <div>
          <p className="text-xl font-black tracking-tight text-sky-400">MediCare AI</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Pharmacy Manager
          </p>
        </div>
      </div>

      <nav className="mt-9 space-y-1.5">
        {managerNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl border-l-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-sky-400 bg-sky-400/10 text-sky-300"
                  : "border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`
            }
          >
            <span className="w-5 text-center text-base" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
