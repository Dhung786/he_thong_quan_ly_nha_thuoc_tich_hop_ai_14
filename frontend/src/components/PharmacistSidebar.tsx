import { NavLink } from "react-router-dom";

const pharmacistNavItems = [
  { to: "/dashboard", icon: "📊", label: "Dashboard", end: true },
  { to: "/pharmacist/medicines", icon: "🔎", label: "Tra cứu thuốc" },
  { to: "/pharmacist/sales-support", icon: "🧾", label: "Hỗ trợ bán thuốc" },
  { to: "/pharmacist/ai", icon: "🤖", label: "AI Dược sĩ" },
  { to: "/pharmacist/process", icon: "📚", label: "Quy trình nội bộ" },
];

export function PharmacistSidebar() {
  return (
    <aside className="border-b border-slate-800 bg-[#07101f] px-4 py-6 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 rotate-[-40deg] place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 shadow-lg shadow-emerald-950/30">
          <span className="rotate-[40deg] text-xl">💊</span>
        </div>
        <div>
          <p className="text-xl font-black tracking-tight text-sky-400">MediCare AI</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Pharmacist Workspace
          </p>
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
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`
            }
          >
            <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
