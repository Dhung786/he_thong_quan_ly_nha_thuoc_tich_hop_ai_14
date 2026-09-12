import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { ManagerSidebar } from "../components/ManagerSidebar";
import {
  accountsRequest,
  changeAccountActiveRequest,
  changeAccountRoleRequest,
  createAccountRequest,
  resetAccountPasswordRequest,
} from "../lib/manager-api";

export function ManagerUsersCashierPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = auth.accessToken ?? "";
  const [form, setForm] = useState({ username: "", password: "", role: "CASHIER" });
  const [message, setMessage] = useState<string | null>(null);

  const accounts = useQuery({ queryKey: ["manager-accounts"], queryFn: () => accountsRequest(token), enabled: Boolean(token) });
  const createUser = useMutation({
    mutationFn: () => createAccountRequest(token, form),
    onSuccess: async () => {
      setForm({ username: "", password: "", role: "CASHIER" });
      setMessage("Đã tạo tài khoản.");
      await qc.invalidateQueries({ queryKey: ["manager-accounts"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Không thể tạo tài khoản."),
  });
  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => changeAccountRoleRequest(token, id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manager-accounts"] }),
  });
  const changeActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => changeAccountActiveRequest(token, id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manager-accounts"] }),
  });

  if (auth.user?.role !== "MANAGER") return <Navigate to="/dashboard" replace />;

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.username.trim().length < 3 || form.password.length < 8) {
      setMessage("Tên đăng nhập cần ít nhất 3 ký tự và mật khẩu ít nhất 8 ký tự.");
      return;
    }
    createUser.mutate();
  }

  async function resetPassword(id: number) {
    const password = window.prompt("Nhập mật khẩu mới (ít nhất 8 ký tự):");
    if (!password || password.length < 8) return;
    try {
      await resetAccountPasswordRequest(token, id, password);
      setMessage("Đã đặt lại mật khẩu.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <ManagerSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <h1 className="text-2xl font-bold">Tài khoản / Phân quyền</h1>
          <button onClick={() => void logout()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold">Đăng xuất</button>
        </header>
        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-6xl space-y-5">
            {message && <div className="rounded-xl border border-cyan-700/40 bg-cyan-950/30 px-4 py-3 text-sm">{message}</div>}
            <section className="rounded-2xl border border-slate-700 bg-[#18253a] p-5">
              <h2 className="font-bold">Tạo tài khoản</h2>
              <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
                <input className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2.5" placeholder="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                <input className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2.5" type="password" placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <select className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="MANAGER">Quản lý</option>
                  <option value="PHARMACIST">Dược sĩ</option>
                  <option value="CASHIER">Thu ngân</option>
                </select>
                <button className="rounded-xl bg-cyan-500 px-4 py-2.5 font-bold text-slate-950" type="submit">Tạo tài khoản</button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-[#18253a] p-5">
              <h2 className="font-bold">Danh sách tài khoản</h2>
              <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Tài khoản</th><th className="px-3 py-2">Vai trò</th><th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-800">{(accounts.data ?? []).map((account) => <tr key={account.id}><td className="px-3 py-3 font-semibold">{account.username}</td><td className="px-3 py-3"><select value={account.role} onChange={(e) => changeRole.mutate({ id: account.id, role: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"><option value="MANAGER">Quản lý</option><option value="PHARMACIST">Dược sĩ</option><option value="CASHIER">Thu ngân</option></select></td><td className="px-3 py-3">{account.is_active ? "Hoạt động" : "Đã khóa"}</td><td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => changeActive.mutate({ id: account.id, active: !account.is_active })} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs">{account.is_active ? "Khóa" : "Mở khóa"}</button><button onClick={() => void resetPassword(account.id)} className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs text-cyan-300">Đặt lại mật khẩu</button></div></td></tr>)}</tbody></table></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
