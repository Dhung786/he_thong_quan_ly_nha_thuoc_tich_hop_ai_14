import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { CashierSidebar } from "../components/CashierSidebar";
import {
  cashierCancelInvoiceRequest,
  cashierCreateInvoiceRequest,
  cashierFinalizeInvoiceRequest,
  cashierInventoryRequest,
  cashierInvoicesRequest,
  cashierMedicinesRequest,
  type CashierInventoryRow,
} from "../lib/cashier-api";

function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("vi-VN")} đ`;
}

function CashierShell({ title, children }: { title: string; children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  if (auth.user?.role !== "CASHIER") return <Navigate to="/dashboard" replace />;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <CashierSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[82px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-1 text-xs text-slate-500">Thu ngân · {auth.user?.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300">CASHIER</span>
            <button onClick={() => void logout()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">Đăng xuất</button>
          </div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
    </div>
  );
}

export function CashierDashboardPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const medicines = useQuery({ queryKey: ["cashier-medicines"], queryFn: () => cashierMedicinesRequest(token), enabled: Boolean(token) });
  const invoices = useQuery({ queryKey: ["cashier-invoices"], queryFn: () => cashierInvoicesRequest(token), enabled: Boolean(token) });

  const today = new Date().toISOString().slice(0, 10);
  const finalizedToday = (invoices.data ?? []).filter((item) => item.status === "FINALIZED" && item.created_at.slice(0, 10) === today);
  const revenueToday = finalizedToday.reduce((sum, item) => sum + Number(item.total_amount), 0);
  const available = (medicines.data ?? []).filter((item) => item.available_quantity > 0).length;

  return (
    <CashierShell title="Dashboard Thu ngân">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Thuốc đang bán" value={available} />
        <Stat label="Hóa đơn hôm nay" value={finalizedToday.length} />
        <Stat label="Doanh thu hôm nay" value={money(revenueToday)} />
        <Stat label="Hóa đơn nháp" value={(invoices.data ?? []).filter((item) => item.status === "DRAFT").length} />
      </section>
      <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Action title="Bán thuốc tại quầy" to="/cashier/sales" text="Chọn lô còn hạn, nhập số lượng, tạo và chốt hóa đơn." />
        <Action title="Tra cứu thuốc" to="/cashier/medicines" text="Tìm thuốc theo tên hoặc mã, xem tồn, giá và hạn dùng gần nhất." />
        <Action title="Hóa đơn của tôi" to="/cashier/invoices" text="Theo dõi hóa đơn nháp, đã thanh toán và đã hủy." />
      </section>
    </CashierShell>
  );
}

export function CashierMedicineLookupPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const [q, setQ] = useState("");
  const medicines = useQuery({ queryKey: ["cashier-medicines", q], queryFn: () => cashierMedicinesRequest(token, q), enabled: Boolean(token) });

  return (
    <CashierShell title="Tra cứu thuốc">
      <div className="rounded-3xl border border-slate-700 bg-[#18253a] p-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập tên thuốc hoặc mã thuốc..." className="w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 outline-none focus:border-cyan-500" />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Mã</th><th className="px-3 py-3">Thuốc</th><th className="px-3 py-3">Nhóm</th><th className="px-3 py-3">Đơn vị</th><th className="px-3 py-3">Tồn</th><th className="px-3 py-3">Giá bán</th><th className="px-3 py-3">Hạn gần nhất</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {(medicines.data ?? []).map((item) => <tr key={item.medicine_id}><td className="px-3 py-4 text-cyan-300">{item.code}</td><td className="px-3 py-4 font-semibold">{item.name}</td><td className="px-3 py-4">{item.group_name}</td><td className="px-3 py-4">{item.unit_name}</td><td className="px-3 py-4">{item.available_quantity}</td><td className="px-3 py-4">{item.min_selling_price ? money(item.min_selling_price) : "—"}</td><td className="px-3 py-4">{item.nearest_expiry ?? "—"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </CashierShell>
  );
}

type CartRow = CashierInventoryRow & { quantity: number };

export function CashierSalesPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartRow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inventory = useQuery({ queryKey: ["cashier-inventory"], queryFn: () => cashierInventoryRequest(token), enabled: Boolean(token) });

  const visible = (inventory.data ?? []).filter((row) => `${row.medicine_name} ${row.medicine_code} ${row.batch_code}`.toLowerCase().includes(search.toLowerCase()));
  const total = useMemo(() => cart.reduce((sum, row) => sum + Number(row.selling_price) * row.quantity, 0), [cart]);

  function add(row: CashierInventoryRow) {
    setCart((current) => {
      const existing = current.find((item) => item.batch_id === row.batch_id);
      if (existing) return current.map((item) => item.batch_id === row.batch_id ? { ...item, quantity: Math.min(item.quantity + 1, item.quantity_remaining) } : item);
      return [...current, { ...row, quantity: 1 }];
    });
  }

  const sell = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error("Chưa có thuốc trong hóa đơn.");
      const code = `HD-${Date.now()}`;
      const draft = await cashierCreateInvoiceRequest(token, { code, items: cart.map((row) => ({ batch_id: row.batch_id, quantity: row.quantity })) });
      return cashierFinalizeInvoiceRequest(token, draft.id);
    },
    onSuccess: async (invoice) => {
      setFeedback(`Thanh toán thành công ${invoice.code} · ${money(invoice.total_amount)}`);
      setCart([]);
      await qc.invalidateQueries({ queryKey: ["cashier-inventory"] });
      await qc.invalidateQueries({ queryKey: ["cashier-invoices"] });
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Không thể thanh toán."),
  });

  return (
    <CashierShell title="Bán thuốc tại quầy">
      {feedback && <div className="mb-5 rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">{feedback}</div>}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-700 bg-[#18253a] p-5">
          <h2 className="text-lg font-bold">Chọn thuốc / lô bán</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên thuốc, mã thuốc hoặc mã lô..." className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/30 px-4 py-3 outline-none focus:border-cyan-500" />
          <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto">
            {visible.map((row) => <button key={row.batch_id} type="button" onClick={() => add(row)} className="w-full rounded-xl border border-slate-700 bg-slate-950/20 p-4 text-left hover:border-cyan-500"><div className="flex justify-between gap-3"><div><p className="font-bold">{row.medicine_name}</p><p className="mt-1 text-xs text-slate-500">{row.medicine_code} · Lô {row.batch_code} · HSD {row.expiry_date}</p></div><div className="text-right"><p className="font-bold text-emerald-300">{money(row.selling_price)}</p><p className="mt-1 text-xs text-slate-500">Tồn {row.quantity_remaining}</p></div></div></button>)}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-[#18253a] p-5">
          <h2 className="text-lg font-bold">Hóa đơn hiện tại</h2>
          <div className="mt-4 space-y-3">
            {cart.map((row) => <div key={row.batch_id} className="rounded-xl border border-slate-700 bg-slate-950/20 p-3"><div className="flex justify-between gap-3"><div><p className="font-semibold">{row.medicine_name}</p><p className="text-xs text-slate-500">Lô {row.batch_code}</p></div><button onClick={() => setCart((c) => c.filter((x) => x.batch_id !== row.batch_id))} className="text-xs text-red-300">Xóa</button></div><div className="mt-3 flex items-center justify-between"><input type="number" min={1} max={row.quantity_remaining} value={row.quantity} onChange={(e) => setCart((c) => c.map((x) => x.batch_id === row.batch_id ? { ...x, quantity: Math.max(1, Math.min(Number(e.target.value) || 1, x.quantity_remaining)) } : x))} className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5" /><span className="font-bold">{money(Number(row.selling_price) * row.quantity)}</span></div></div>)}
            {!cart.length && <p className="py-8 text-center text-sm text-slate-500">Chưa có thuốc trong hóa đơn.</p>}
          </div>
          <div className="mt-6 border-t border-slate-700 pt-5"><div className="flex justify-between text-lg font-black"><span>Tổng tiền</span><span className="text-emerald-300">{money(total)}</span></div><button disabled={!cart.length || sell.isPending} onClick={() => sell.mutate()} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-black text-slate-950 disabled:opacity-40">{sell.isPending ? "Đang thanh toán..." : "Thanh toán & chốt hóa đơn"}</button></div>
        </section>
      </div>
    </CashierShell>
  );
}

export function CashierInvoicesPage() {
  const auth = useAuth();
  const token = auth.accessToken ?? "";
  const qc = useQueryClient();
  const invoices = useQuery({ queryKey: ["cashier-invoices"], queryFn: () => cashierInvoicesRequest(token), enabled: Boolean(token) });
  const cancel = useMutation({ mutationFn: (id: number) => cashierCancelInvoiceRequest(token, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["cashier-invoices"] }) });

  return (
    <CashierShell title="Hóa đơn của tôi">
      <div className="rounded-3xl border border-slate-700 bg-[#18253a] p-5">
        <div className="space-y-3">{(invoices.data ?? []).map((invoice) => <div key={invoice.id} className="rounded-xl border border-slate-700 bg-slate-950/20 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{invoice.code}</p><p className="mt-1 text-xs text-slate-500">{new Date(invoice.created_at).toLocaleString("vi-VN")} · {invoice.items.length} dòng thuốc</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${invoice.status === "FINALIZED" ? "bg-emerald-500/10 text-emerald-300" : invoice.status === "DRAFT" ? "bg-amber-500/10 text-amber-200" : "bg-slate-700 text-slate-300"}`}>{invoice.status === "FINALIZED" ? "Đã thanh toán" : invoice.status === "DRAFT" ? "Nháp" : "Đã hủy"}</span><span className="font-black">{money(invoice.total_amount)}</span>{invoice.status === "DRAFT" && <button onClick={() => cancel.mutate(invoice.id)} className="rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-300">Hủy</button>}</div></div></div>)}</div>
      </div>
    </CashierShell>
  );
}

export function CashierProfilePage() {
  const auth = useAuth();
  return <CashierShell title="Hồ sơ Thu ngân"><div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-[#18253a] p-7"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl font-black text-cyan-300">{(auth.user?.username ?? "T").slice(0, 1).toUpperCase()}</div><div><h2 className="text-2xl font-bold">{auth.user?.username}</h2><p className="text-sm text-slate-400">Thu ngân nhà thuốc</p></div></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><Stat label="Tên đăng nhập" value={auth.user?.username ?? "—"} /><Stat label="Vai trò" value="CASHIER" /><Stat label="Trạng thái" value="Đang đăng nhập" /><Stat label="Quyền truy cập" value="Bán thuốc, tra cứu, hóa đơn" /></div></div></CashierShell>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-700 bg-[#18253a] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-xl font-black text-slate-100">{value}</p></div>;
}

function Action({ title, to, text }: { title: string; to: string; text: string }) {
  return <Link to={to} className="rounded-2xl border border-slate-700 bg-[#18253a] p-5 transition hover:border-cyan-500/50"><h2 className="font-bold text-cyan-200">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p><p className="mt-4 text-sm font-semibold text-cyan-300">Mở chức năng →</p></Link>;
}
