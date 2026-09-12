import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "../auth/auth-context";
import { ApiError } from "../lib/api";

const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập").max(100),
  password: z.string().min(1, "Vui lòng nhập mật khẩu").max(256),
});

type LoginForm = z.infer<typeof loginSchema>;

function formatApiError(error: ApiError): string {
  let message: string;
  if (error.status === 401) {
    message = "Tên đăng nhập hoặc mật khẩu không đúng.";
  } else if (error.status === 422) {
    message = "Dữ liệu đăng nhập không hợp lệ.";
  } else if (error.status === 503) {
    message = "Dịch vụ hiện chưa sẵn sàng. Vui lòng thử lại sau.";
  } else {
    message = "Không thể kết nối hệ thống. Vui lòng thử lại.";
  }

  if (error.correlationId) {
    return `${message} Mã hỗ trợ: ${error.correlationId}`;
  }
  return message;
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (auth.status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await auth.login(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(formatApiError(error));
      } else {
        setSubmitError("Không thể kết nối hệ thống. Vui lòng thử lại.");
      }
    }
  });

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-10 lg:grid-cols-2">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-400">
            Pharmacy AI · Nhóm 14
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
            Hệ thống quản lý nhà thuốc có tích hợp AI
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
            Đăng nhập bằng tài khoản Quản lý, Dược sĩ hoặc Thu ngân. Quyền nghiệp vụ được
            backend kiểm tra theo vai trò được cấp.
          </p>
          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
            <InfoCard title="Quản lý" text="Quản trị hệ thống" />
            <InfoCard title="Dược sĩ" text="Nghiệp vụ nhà thuốc" />
            <InfoCard title="Thu ngân" text="Bán hàng & hóa đơn" />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
          <div className="mb-7">
            <p className="text-sm text-slate-400">Chào mừng trở lại</p>
            <h2 className="mt-1 text-2xl font-semibold">Đăng nhập hệ thống</h2>
          </div>

          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Tên đăng nhập
              </span>
              <input
                {...register("username")}
                autoComplete="username"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Nhập tên đăng nhập"
              />
              {errors.username && (
                <span className="mt-2 block text-sm text-red-400">{errors.username.message}</span>
              )}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Mật khẩu</span>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Nhập mật khẩu"
              />
              {errors.password && (
                <span className="mt-2 block text-sm text-red-400">{errors.password.message}</span>
              )}
            </label>

            {submitError && (
              <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{text}</p>
    </div>
  );
}
