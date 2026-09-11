import { NavLink } from "react-router-dom";

const pharmacistNavItems = [
  { to: "/dashboard", icon: "📊", label: "Dashboard", end: true },
  { to: "/pharmacist/medicines", icon: "🔎", label: "Tra cứu thuốc" },
  { to: "/pharmacist/inventory", icon: "📦", label: "Tồn kho & lô thuốc" },
  { to: "/pharmacist/suppliers", icon: "🏢", label: "Nhà cung cấp" },
  { to: "/pharmacist/alerts", icon: "⚠️", label: "Cảnh báo" },
  { to: "/pharmacist/sales-support", icon: "🧾", label: "Hỗ trợ bán thuốc" },
  { to: "/pharmacist/ai", icon: "🤖", label: "AI Dược sĩ" },
  { to: "/pharmacist/process", icon: "📚", label: "Quy trình nội bộ" },
  { to: "/pharmacist/reports", icon: "📈", label: "Báo cáo" },
  { to: "/pharmacist/profile", icon: "⚙️", label: "Hồ sơ" },
];

export function PharmacistSidebar() {
  return (
    <aside className="border-b border-slate-800 bg-[#06101f] px-4 py-6 lg:min-h-screen lg:border-b-0 lg:border-r lg:border-slate-800/80">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 rotate-[-40deg] place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-lg shadow-cyan-950/30">
          <span className="rotate-[40deg] text-xl">💊</span>
        </div>
        <div>
          <p className="text-xl font-black tracking-tight text-cyan-400">MediCare AI</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Hệ thống quản lý nhà thuốc</p>
        </div>
      </div>

      <nav className="mt-9 space-y-1.5">
        {pharmacistNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl border-l-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                  : "border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`
            }
          >
            <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
