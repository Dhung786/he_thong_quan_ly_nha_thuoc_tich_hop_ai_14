import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { CashierSidebar } from "../components/CashierSidebar";
import { cashierInvoicesRequest, cashierMedicinesRequest } from "../lib/cashier-api";

function money(value: string | number) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

export function CashierDashboardEnhancedPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const token = auth.accessToken ?? "";
  const medicines = useQuery({ queryKey: ["cashier-medicines"], queryFn: () => cashierMedicinesRequest(token), enabled: Boolean(token) });
  const invoices = useQuery({ queryKey: ["cashier-invoices"], queryFn: () => cashierInvoicesRequest(token), enabled: Boolean(token) });

  if (auth.user?.role !== "CASHIER") return <Navigate to="/dashboard" replace />;

  const today = new Date().toISOString().slice(0, 10);
  const todayRows = (invoices.data ?? []).filter((invoice) => invoice.created_at.slice(0, 10) === today);
  const finalized = todayRows.filter((invoice) => invoice.status === "FINALIZED");
  const revenue = finalized.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const units = finalized.reduce((sum, invoice) => sum + invoice.items.reduce((s, item) => s + item.quantity, 0), 0);
  const available = (medicines.data ?? []).filter((item) => item.available_quantity > 0).length;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <CashierSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[82px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div><h1 className="text-2xl font-black">Dashboard Thu ngân</h1><p className="mt-1 text-xs text-slate-500">Thu ngân · {auth.user?.username}</p></div>
          <div className="flex items-center gap-3"><span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">CASHIER</span><button onClick={() => void logout()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button></div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Thuốc đang bán" value={available} />
              <Stat label="Hóa đơn hôm nay" value={finalized.length} />
              <Stat label="Doanh thu hôm nay" value={money(revenue)} />
              <Stat label="Thuốc đã bán hôm nay" value={units} />
            </section>
            <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Action title="🧾 Bán thuốc tại quầy" to="/cashier/sales" text="Quét mã, chọn lô FEFO, kiểm tra tồn/hạn dùng và thanh toán." />
              <Action title="🔎 Tra cứu thuốc" to="/cashier/medicines" text="Tìm thuốc theo tên hoặc mã, xem tồn, giá và hạn dùng gần nhất." />
              <Action title="📋 Hóa đơn của tôi" to="/cashier/invoices" text="Tìm, lọc, xem chi tiết, hủy hóa đơn nháp, in và xuất hóa đơn." />
              <Action title="📈 Tổng kết ca" to="/cashier/shift" text="Xem số hóa đơn, doanh thu và số lượng thuốc đã bán theo ngày." />
              <Action title="🤖 AI hỗ trợ Thu ngân" to="/cashier/assistant" text="Hỏi quy trình bán hàng, FEFO, tồn kho, thanh toán và hóa đơn." />
              <Action title="⚙️ Hồ sơ" to="/cashier/profile" text="Xem thông tin tài khoản Thu ngân đang đăng nhập." />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>;
}

function Action({ title, to, text }: { title: string; to: string; text: string }) {
  return <Link to={to} className="rounded-2xl border border-slate-700 bg-[#18253a] p-5 transition hover:border-cyan-500/60"><h2 className="font-bold text-cyan-200">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{text}</p><p className="mt-4 text-sm font-semibold text-cyan-300">Mở chức năng →</p></Link>;
}
