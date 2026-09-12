import { NavLink } from "react-router-dom";

const items = [
  ["📊", "Dashboard", "/cashier"],
  ["🧾", "Bán thuốc tại quầy", "/cashier/sales"],
  ["🔎", "Tra cứu thuốc", "/cashier/medicines"],
  ["📋", "Hóa đơn của tôi", "/cashier/invoices"],
  ["⚙️", "Hồ sơ", "/cashier/profile"],
] as const;

export function CashierSidebar() {
  return (
    <aside className="min-h-screen border-r border-slate-800 bg-[#071526] p-5 lg:sticky lg:top-0 lg:h-screen">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-2xl">💊</div>
        <div>
          <p className="text-xl font-black text-cyan-300">MediCare AI</p>
          <p className="text-xs text-slate-500">Hệ thống quản lý nhà thuốc</p>
        </div>
      </div>

      <nav className="space-y-2">
        {items.map(([icon, label, to]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/cashier"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                  : "border-transparent text-slate-300 hover:bg-slate-800/70"
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
