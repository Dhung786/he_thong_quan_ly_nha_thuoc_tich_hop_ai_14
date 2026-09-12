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
  if (error.status === 401) message = "Tên đăng nhập hoặc mật khẩu không đúng.";
  else if (error.status === 422) message = "Dữ liệu đăng nhập không hợp lệ.";
  else if (error.status === 503) message = "Dịch vụ hiện chưa sẵn sàng. Vui lòng thử lại sau.";
  else message = "Không thể kết nối hệ thống. Vui lòng thử lại.";
  return error.correlationId ? `${message} Mã hỗ trợ: ${error.correlationId}` : message;
}

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lampOn, setLampOn] = useState(false);
  const [pulling, setPulling] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (auth.status === "authenticated") return <Navigate to="/dashboard" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await auth.login(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) setSubmitError(formatApiError(error));
      else setSubmitError("Không thể kết nối hệ thống. Vui lòng thử lại.");
    }
  });

  function toggleLamp() {
    setPulling(true);
    window.setTimeout(() => {
      setLampOn((value) => !value);
      setPulling(false);
    }, 170);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-slate-100">
      <div
        className={`pointer-events-none absolute inset-0 transition-all duration-700 ${
          lampOn
            ? "bg-[radial-gradient(circle_at_31%_36%,rgba(255,238,181,0.22),transparent_18%),radial-gradient(circle_at_48%_48%,rgba(16,185,129,0.05),transparent_32%)]"
            : "bg-[radial-gradient(circle_at_31%_36%,rgba(255,255,255,0.02),transparent_12%)]"
        }`}
      />

      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
        <section className="relative flex min-h-[560px] items-center justify-center">
          <div className="relative flex flex-col items-center">
            <div
              className={`absolute -top-28 h-72 w-72 rounded-full blur-3xl transition-all duration-500 ${
                lampOn ? "bg-amber-200/20 opacity-100" : "bg-transparent opacity-0"
              }`}
            />

            <div className="relative z-10 flex flex-col items-center">
              <div className={`h-5 w-44 rounded-[999px_999px_12px_12px] transition ${lampOn ? "bg-amber-100 shadow-[0_0_55px_rgba(254,240,138,.7)]" : "bg-slate-300"}`} />
              <div className={`h-3 w-36 rounded-b-full transition ${lampOn ? "bg-amber-50" : "bg-slate-400"}`} />
              <div className="mt-1 h-36 w-3 rounded-full bg-slate-300" />
              <div className="h-4 w-20 rounded-full bg-slate-300" />
            </div>

            <button
              type="button"
              aria-label="Bật hoặc tắt đèn"
              onClick={toggleLamp}
              className="absolute left-[calc(50%+42px)] top-[28px] z-20 flex flex-col items-center outline-none"
            >
              <span
                className={`block w-[2px] bg-slate-300 transition-all duration-150 ${pulling ? "h-28" : "h-20"}`}
              />
              <span className={`block h-3 w-3 rounded-full border border-slate-200 bg-amber-300 transition-transform ${pulling ? "translate-y-2" : ""}`} />
            </button>

            <p className="mt-10 text-xs uppercase tracking-[0.28em] text-slate-600">
              Kéo dây để bật đèn
            </p>
          </div>
        </section>

        <section
          className={`transition-all duration-700 ${
            lampOn ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-10 opacity-0"
          }`}
        >
          <div className="grid items-center gap-10 xl:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-400">
                MEDICARE AI · NHÓM 14
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] sm:text-5xl xl:text-6xl">
                Hệ thống quản lý nhà thuốc có tích hợp AI
              </h1>
            </div>

            <div className="rounded-[30px] border border-slate-700/80 bg-[#111b30]/95 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
              <div className="mb-7">
                <p className="text-sm text-slate-400">Chào mừng trở lại</p>
                <h2 className="mt-1 text-3xl font-semibold">Đăng nhập hệ thống</h2>
              </div>

              <form className="space-y-5" onSubmit={onSubmit} noValidate>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Tên đăng nhập</span>
                  <input
                    {...register("username")}
                    autoComplete="username"
                    className="w-full rounded-2xl border border-slate-600 bg-[#2a3854] px-4 py-4 text-lg outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Nhập tên đăng nhập"
                  />
                  {errors.username && <span className="mt-2 block text-sm text-red-400">{errors.username.message}</span>}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Mật khẩu</span>
                  <input
                    {...register("password")}
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-600 bg-[#2a3854] px-4 py-4 text-lg outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Nhập mật khẩu"
                  />
                  {errors.password && <span className="mt-2 block text-sm text-red-400">{errors.password.message}</span>}
                </label>

                {submitError && (
                  <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
