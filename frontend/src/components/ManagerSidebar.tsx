import { NavLink } from "react-router-dom";

type ManagerNavItem = {
  to: string;
  label: string;
  icon?: string;
  end?: boolean;
};

type ManagerNavGroup = {
  title: string;
  icon: string;
  items: ManagerNavItem[];
};

const managerNavGroups: ManagerNavGroup[] = [
  {
    title: "1. Tổng quan / Dashboard",
    icon: "📊",
    items: [
      { to: "/dashboard", label: "Dashboard", end: true },
      { to: "/manager/overview/medicines", label: "Tổng số thuốc" },
      { to: "/manager/overview/low-stock", label: "Thuốc tồn thấp" },
      { to: "/manager/overview/expiry", label: "Thuốc sắp hết hạn" },
    ],
  },
  {
    title: "2. Quản lý thuốc",
    icon: "💊",
    items: [
      { to: "/catalog", label: "Danh sách thuốc" },
      { to: "/manager/medicine-groups", label: "Nhóm thuốc" },
      { to: "/manager/units", label: "Đơn vị tính" },
    ],
  },
  {
    title: "3. Quản lý nhập thuốc",
    icon: "📦",
    items: [
      { to: "/manager/imports", label: "Danh sách lô nhập" },
      { to: "/manager/imports/new", label: "Thêm lô nhập" },
      { to: "/manager/suppliers", label: "Nhà cung cấp" },
    ],
  },
  {
    title: "4. Bán thuốc",
    icon: "🧾",
    items: [
      { to: "/manager/sales", label: "Bán thuốc" },
      { to: "/manager/invoices", label: "Hóa đơn" },
    ],
  },
  {
    title: "5. Tồn kho",
    icon: "📚",
    items: [
      { to: "/manager/inventory", label: "Danh sách tồn kho" },
      { to: "/manager/low-stock", label: "Cảnh báo tồn thấp" },
    ],
  },
  {
    title: "6. Hạn sử dụng",
    icon: "⏳",
    items: [
      { to: "/manager/expiry-soon", label: "Thuốc sắp hết hạn" },
      { to: "/manager/expired", label: "Thuốc đã hết hạn" },
    ],
  },
  {
    title: "7. Tra cứu thuốc",
    icon: "🔎",
    items: [{ to: "/manager/lookup", label: "Tra cứu thuốc" }],
  },
  {
    title: "8. Báo cáo - Thống kê",
    icon: "📈",
    items: [
      { to: "/manager/reports/revenue", label: "Doanh thu" },
      { to: "/manager/reports/inventory", label: "Tồn kho" },
      { to: "/manager/reports/expiry", label: "Thuốc sắp hết hạn" },
    ],
  },
  {
    title: "9. Trợ lý AI",
    icon: "🤖",
    items: [
      { to: "/manager/ai/medicine-summary", label: "AI tóm tắt thông tin thuốc" },
      { to: "/manager/ai/expiry-report", label: "AI báo cáo thuốc sắp hết hạn" },
      { to: "/manager/ai/process-chat", label: "Chatbot quy trình nội bộ" },
    ],
  },
  {
    title: "10. Tài khoản / Phân quyền",
    icon: "🔐",
    items: [
      { to: "/manager/accounts", label: "Tài khoản & phân quyền" },
      { to: "/manager/profile", label: "Hồ sơ quản lý" },
    ],
  },
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

      <nav className="mt-8 space-y-4">
        {managerNavGroups.map((group) => (
          <section key={group.title} className="rounded-2xl border border-slate-800/70 bg-slate-950/15 p-2.5">
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              <span aria-hidden="true">{group.icon}</span>
              <span>{group.title}</span>
            </div>

            <div className="mt-1 space-y-1 border-l border-slate-700/70 pl-3">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-[13px] transition ${
                      isActive
                        ? "bg-sky-500/15 font-semibold text-sky-300"
                        : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
                    }`
                  }
                >
                  <span className="mr-2 text-slate-600">└</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
