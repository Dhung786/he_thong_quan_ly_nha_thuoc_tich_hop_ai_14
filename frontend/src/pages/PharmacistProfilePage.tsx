import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/auth-context";
import { PharmacistSidebar } from "../components/PharmacistSidebar";

export function PharmacistProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();

  if (auth.user?.role !== "PHARMACIST") {
    return <Navigate to="/dashboard" replace />;
  }

  async function logout() {
    await auth.logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-slate-100 lg:grid lg:grid-cols-[310px_1fr]">
      <PharmacistSidebar />
      <div className="min-w-0">
        <header className="flex min-h-[84px] items-center justify-between border-b border-slate-800 bg-[#0d152a] px-5 sm:px-8">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Hồ sơ Dược sĩ</h1>
            <p className="mt-1 text-xs text-slate-500">Thông tin tài khoản đang đăng nhập</p>
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold hover:border-red-700 hover:text-red-300">
            Đăng xuất
          </button>
        </header>

        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-4xl">
            <section className="rounded-3xl border border-slate-700/70 bg-[#18253a] p-7 sm:p-9">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/15 text-2xl font-black text-cyan-300">
                  {(auth.user?.username ?? "D").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{auth.user?.username}</h2>
                  <p className="mt-1 text-sm text-slate-400">Dược sĩ nhà thuốc</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Info label="Tên đăng nhập" value={auth.user?.username ?? "—"} />
                <Info label="Vai trò" value="PHARMACIST" />
                <Info label="Trạng thái" value="Đang đăng nhập" />
                <Info label="Quyền truy cập" value="Tra cứu thuốc, tồn kho, cảnh báo, báo cáo và AI hỗ trợ" />
              </div>

              <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-950/25 p-5 text-sm leading-6 text-slate-400">
                Chức năng đổi mật khẩu chưa được bật vì backend hiện chưa có API đổi mật khẩu cho chính tài khoản Dược sĩ. Hệ thống không hiển thị nút giả để tránh thao tác không có tác dụng.
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/20 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-slate-100">{value}</p>
    </div>
  );
}
