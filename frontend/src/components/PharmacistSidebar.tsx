import { NavLink } from "react-router-dom";

const pharmacistNavItems = [
  { to: "/dashboard", icon: "📊", label: "Dashboard", uc: "UC001", end: true },
  { to: "/pharmacist/medicines", icon: "🔎", label: "Tra cứu thuốc", uc: "UC007" },
  { to: "/pharmacist/inventory", icon: "📦", label: "Tồn kho & lô thuốc", uc: "UC006" },
  { to: "/pharmacist/suppliers", icon: "🏢", label: "Nhà cung cấp", uc: "UC005" },
  { to: "/pharmacist/alerts", icon: "⚠️", label: "Cảnh báo", uc: "UC008" },
  { to: "/pharmacist/sales-support", icon: "🧾", label: "Hỗ trợ bán thuốc" },
  { to: "/pharmacist/ai", icon: "🤖", label: "AI Dược sĩ", uc: "UC010 · UC011 · UC013" },
  { to: "/pharmacist/process", icon: "📚", label: "Quy trình nội bộ", uc: "UC012" },
  { to: "/pharmacist/reports", icon: "📈", label: "Báo cáo", uc: "UC009" },
  { to: "/pharmacist/profile", icon: "⚙️", label: "Hồ sơ" },
  { to: "/use-cases", icon: "📋", label: "Use Cases SRS", uc: "10 UC" },
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
            {item.uc && <span className="shrink-0 rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">{item.uc}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs leading-5 text-slate-500 lg:mt-16">
        <div className="mb-2 text-lg">✨</div>
        <p>Ứng dụng AI đồng hành cùng dược sĩ mỗi ngày.</p>
      </div>
    </aside>
  );
}
