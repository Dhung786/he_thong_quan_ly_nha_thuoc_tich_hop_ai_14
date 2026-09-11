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
    <aside className="border-b border-slate-800 bg-[#07101f] px-4 py-6 lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-11 w-11 rotate-[-40deg] place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-950/30">
          <span className="rotate-[40deg] text-xl">💊</span>
        </div>
        <div>
          <p className="text-xl font-black tracking-tight text-sky-400">MediCare AI</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Manager Workspace
          </p>
        </div>
      </div>

      <nav className="mt-9 space-y-1.5">
        {managerNavItems.map((item, index) => (
          <div key={item.to}>
            <NavLink
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
              <span className="w-5 text-center text-base" aria-hidden="true">{item.icon}</span>
              <span>{index + 1}. {item.label}</span>
            </NavLink>
            {index === 0 && (
              <div className="ml-12 mt-1 space-y-1 text-[11px] text-slate-600">
                <p>Doanh thu</p><p>Tổng số thuốc</p><p>Thuốc tồn thấp</p><p>Thuốc sắp hết hạn</p>
              </div>
            )}
            {index === 1 && (
              <div className="ml-12 mt-1 space-y-1 text-[11px] text-slate-600">
                <p>Danh sách thuốc</p><p>Nhóm thuốc</p><p>Đơn vị tính</p>
              </div>
            )}
            {index === 2 && (
              <div className="ml-12 mt-1 space-y-1 text-[11px] text-slate-600">
                <p>Danh sách lô nhập</p><p>Thêm lô nhập</p><p>Nhà cung cấp</p>
              </div>
            )}
            {index === 3 && <p className="ml-12 mt-1 text-[11px] text-slate-600">Bán thuốc · Hóa đơn</p>}
            {index === 4 && <p className="ml-12 mt-1 text-[11px] text-slate-600">Danh sách tồn kho · Cảnh báo tồn thấp</p>}
            {index === 5 && <p className="ml-12 mt-1 text-[11px] text-slate-600">Thuốc sắp hết hạn · Thuốc đã hết hạn</p>}
            {index === 7 && <p className="ml-12 mt-1 text-[11px] text-slate-600">Doanh thu · Tồn kho · Thuốc sắp hết hạn</p>}
            {index === 8 && <p className="ml-12 mt-1 text-[11px] text-slate-600">AI tóm tắt · AI hạn dùng · Chatbot nội bộ</p>}
          </div>
        ))}
      </nav>
    </aside>
  );
}
