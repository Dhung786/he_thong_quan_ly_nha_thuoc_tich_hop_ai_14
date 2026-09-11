import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "../auth/auth-context";
import {
  ApiError,
  adminAuditLogsRequest,
  adminSummaryRequest,
  adminUsersRequest,
  createAdminUserRequest,
  resetAdminUserPasswordRequest,
  updateAdminUserRoleRequest,
  updateAdminUserStatusRequest,
  type AdminRole,
} from "../lib/api";

const roleOptions: { value: AdminRole; label: string }[] = [
  { value: "MANAGER", label: "Quản lý" },
  { value: "PHARMACIST", label: "Dược sĩ" },
  { value: "CASHIER", label: "Thu ngân" },
];

const createUserSchema = z.object({
  username: z.string().trim().min(3, "Tên đăng nhập tối thiểu 3 ký tự"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  role: z.enum(["MANAGER", "PHARMACIST", "CASHIER"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    const suffix = error.correlationId ? ` (mã hỗ trợ: ${error.correlationId})` : "";
    if (error.code === "username_exists") return `Tên đăng nhập đã tồn tại${suffix}`;
    if (error.code === "self_lock_blocked") return `Không thể tự khóa tài khoản đang dùng${suffix}`;
    if (error.code === "self_role_change_blocked") return `Không thể tự hạ quyền Quản lý${suffix}`;
    return `${error.message}${suffix}`;
  }
  return "Đã xảy ra lỗi không xác định";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const accessToken = auth.accessToken ?? "";
  const isManager = auth.user?.role === "MANAGER";
  const [feedback, setFeedback] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ["admin-summary"],
    queryFn: () => adminSummaryRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminUsersRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
  });
  const auditLogs = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => adminAuditLogsRequest(accessToken),
    enabled: isManager && Boolean(accessToken),
  });

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", password: "", role: "PHARMACIST" },
  });

  async function refreshAdminData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
    ]);
  }

  const createUser = useMutation({
    mutationFn: (values: CreateUserForm) => createAdminUserRequest(accessToken, values),
    onSuccess: async () => {
      form.reset({ username: "", password: "", role: "PHARMACIST" });
      setFeedback("Đã tạo tài khoản mới");
      await refreshAdminData();
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: AdminRole }) =>
      updateAdminUserRoleRequest(accessToken, userId, role),
    onSuccess: async () => {
      setFeedback("Đã cập nhật vai trò");
      await refreshAdminData();
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      updateAdminUserStatusRequest(accessToken, userId, isActive),
    onSuccess: async (_, variables) => {
      setFeedback(variables.isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
      await refreshAdminData();
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  const resetPassword = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      resetAdminUserPasswordRequest(accessToken, userId, password),
    onSuccess: async () => {
      setFeedback("Đã đặt lại mật khẩu và thu hồi phiên refresh hiện tại của tài khoản");
      await refreshAdminData();
    },
    onError: (error) => setFeedback(errorText(error)),
  });

  if (!isManager) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900/60 bg-red-950/20 p-6">
          <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
          <p className="mt-3 text-slate-300">Khu vực quản trị hệ thống chỉ dành cho vai trò Quản lý.</p>
          <Link to="/dashboard" className="mt-5 inline-block text-emerald-300 hover:text-emerald-200">
            ← Quay lại tổng quan
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link to="/dashboard" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
          ← Tổng quan
        </Link>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Quản trị hệ thống</p>
            <h1 className="mt-2 text-3xl font-bold">Tài khoản và nhật ký hoạt động</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Chức năng bổ sung theo yêu cầu mới: tạo tài khoản, phân vai trò, khóa/mở khóa,
              đặt lại mật khẩu và xem audit log. Không tạo role thứ tư ngoài SRS.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <span className="text-slate-500">Đang đăng nhập: </span>
            <strong>{auth.user?.username}</strong>
          </div>
        </div>

        {feedback ? (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200">
            {feedback}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Tổng tài khoản" value={summary.data?.total_users} />
          <SummaryCard label="Đang hoạt động" value={summary.data?.active_users} />
          <SummaryCard label="Đã khóa" value={summary.data?.inactive_users} />
          <SummaryCard label="Sự kiện audit" value={summary.data?.audit_events} />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Tạo tài khoản</h2>
          <form
            className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_240px_auto]"
            onSubmit={form.handleSubmit((values) => createUser.mutate(values))}
          >
            <div>
              <label className="text-sm text-slate-400">Tên đăng nhập</label>
              <input
                {...form.register("username")}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="vd: duocsi01"
              />
              <p className="mt-1 text-xs text-red-300">{form.formState.errors.username?.message}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Mật khẩu ban đầu</label>
              <input
                {...form.register("password")}
                type="password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Tối thiểu 8 ký tự"
              />
              <p className="mt-1 text-xs text-red-300">{form.formState.errors.password?.message}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Vai trò</label>
              <select
                {...form.register("role")}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="self-end rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {createUser.isPending ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">Quản lý tài khoản</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý không thể tự khóa hoặc tự hạ vai trò của chính mình.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-950/50 text-slate-400">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Tên đăng nhập</th>
                  <th className="px-6 py-3">Vai trò</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3">Ngày tạo</th>
                  <th className="px-6 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.data?.map((user) => (
                  <tr key={user.id} className="text-slate-200">
                    <td className="px-6 py-4">{user.id}</td>
                    <td className="px-6 py-4 font-medium">{user.username}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(event) => changeRole.mutate({ userId: user.id, role: event.target.value as AdminRole })}
                        disabled={changeRole.isPending}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.is_active ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300"}`}>
                        {user.is_active ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{formatTime(user.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => changeStatus.mutate({ userId: user.id, isActive: !user.is_active })}
                          className="rounded-lg border border-slate-700 px-3 py-2 hover:border-emerald-700"
                        >
                          {user.is_active ? "Khóa" : "Mở khóa"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const password = window.prompt(`Mật khẩu mới cho ${user.username} (tối thiểu 8 ký tự):`);
                            if (password && password.length >= 8) {
                              resetPassword.mutate({ userId: user.id, password });
                            } else if (password !== null) {
                              setFeedback("Mật khẩu mới phải có ít nhất 8 ký tự");
                            }
                          }}
                          className="rounded-lg border border-slate-700 px-3 py-2 hover:border-amber-700"
                        >
                          Đặt lại mật khẩu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold">Nhật ký audit gần nhất</h2>
            <p className="mt-1 text-sm text-slate-500">Hiển thị tối đa 100 sự kiện mới nhất.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-950/50 text-slate-400">
                <tr>
                  <th className="px-6 py-3">Thời gian</th>
                  <th className="px-6 py-3">Người thực hiện</th>
                  <th className="px-6 py-3">Sự kiện</th>
                  <th className="px-6 py-3">Đối tượng</th>
                  <th className="px-6 py-3">Correlation ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.data?.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 text-slate-400">{formatTime(log.created_at)}</td>
                    <td className="px-6 py-4">{log.actor_username ?? "Hệ thống"}</td>
                    <td className="px-6 py-4 font-medium text-emerald-300">{log.event_type}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {String(log.details.entity_type ?? "-")} #{String(log.details.entity_id ?? "-")}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.correlation_id ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value ?? "—"}</p>
    </div>
  );
}
