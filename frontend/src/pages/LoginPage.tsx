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
    <main className="relative min-h-screen overflow-hidden bg-[#03091a] text-slate-100">
      <div
        className={`pointer-events-none absolute inset-0 transition-all duration-700 ${
          lampOn
            ? "bg-[radial-gradient(circle_at_28%_39%,rgba(255,240,194,0.24),transparent_19%),radial-gradient(circle_at_58%_46%,rgba(255,255,255,0.025),transparent_30%)]"
            : "bg-[radial-gradient(circle_at_28%_39%,rgba(255,255,255,0.015),transparent_12%)]"
        }`}
      />

      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <section className="relative flex min-h-[560px] items-center justify-center">
          <div className="relative flex flex-col items-center">
            <div
              className={`absolute -top-24 h-80 w-80 rounded-full blur-3xl transition-all duration-500 ${
                lampOn ? "bg-[#fff0b0]/20 opacity-100" : "opacity-0"
              }`}
            />

            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`relative h-[62px] w-[178px] rounded-t-[90px] rounded-b-[28px] transition-all duration-500 ${
                  lampOn
                    ? "bg-[#f7f4e8] shadow-[0_0_55px_rgba(255,241,190,0.55)]"
                    : "bg-[#cfd3d8]"
                }`}
              >
                <div
                  className={`absolute bottom-1 left-1/2 h-[10px] w-[116px] -translate-x-1/2 rounded-full transition-all ${
                    lampOn ? "bg-[#fff2bd]" : "bg-[#b9bec5]"
                  }`}
                />
              </div>
              <div className="mt-1 h-[156px] w-[12px] rounded-full bg-[#d9dde2]" />
              <div className="h-[12px] w-[88px] rounded-full bg-[#d9dde2]" />
            </div>

            <button
              type="button"
              aria-label="Bật hoặc tắt đèn"
              onClick={toggleLamp}
              className="absolute left-[calc(50%+48px)] top-[48px] z-20 flex flex-col items-center outline-none"
            >
              <span
                className={`block w-[2px] bg-[#d8d6cd] transition-all duration-150 ${pulling ? "h-[92px]" : "h-[72px]"}`}
              />
              <span
                className={`block h-[11px] w-[11px] rounded-full bg-[#d4b46a] shadow-[0_0_8px_rgba(228,197,112,0.35)] transition-transform ${
                  pulling ? "translate-y-2" : ""
                }`}
              />
            </button>
          </div>
        </section>

        <section
          className={`transition-all duration-700 ${
            lampOn ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0"
          }`}
        >
          <div className="grid items-center gap-10 xl:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
                MEDICARE AI · NHÓM 14
              </p>
              <h1 className="mt-5 max-w-lg text-[34px] font-black leading-[1.08] sm:text-[40px] xl:text-[48px]">
                Hệ thống quản lý nhà thuốc có tích hợp AI
              </h1>
            </div>

            <div className="w-full max-w-[420px] justify-self-end rounded-[24px] border border-white/10 bg-white/[0.07] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.48)] backdrop-blur-xl sm:p-8">
              <div className="mb-7">
                <p className="text-sm text-white/65">Chào mừng trở lại</p>
                <h2 className="mt-1 text-[24px] font-semibold leading-tight text-white">Đăng nhập hệ thống</h2>
              </div>

              <form className="space-y-5" onSubmit={onSubmit} noValidate>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-white/70">Tên đăng nhập</span>
                  <input
                    {...register("username")}
                    autoComplete="username"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3.5 text-[15px] text-white outline-none transition placeholder:text-white/25 focus:border-[#dfca85]/70 focus:bg-white/[0.1]"
                    placeholder="Nhập tên đăng nhập"
                  />
                  {errors.username && <span className="mt-2 block text-sm text-red-400">{errors.username.message}</span>}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-white/70">Mật khẩu</span>
                  <input
                    {...register("password")}
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3.5 text-[15px] text-white outline-none transition placeholder:text-white/25 focus:border-[#dfca85]/70 focus:bg-white/[0.1]"
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
                  className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-[#211d12] shadow-[0_8px_24px_rgba(225,196,106,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: "linear-gradient(110deg, #e2cc88 0%, #fff4bd 48%, #d8b95f 100%)",
                  }}
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
