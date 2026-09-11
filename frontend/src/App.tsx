import { useQuery } from "@tanstack/react-query";

interface HealthResponse {
  core: string;
  database: string;
  ai: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function loadHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}/health`);
  if (!response.ok) {
    throw new Error("Backend health check failed");
  }
  return response.json() as Promise<HealthResponse>;
}

export default function App() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: loadHealth,
    retry: false,
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Phase 2A Foundation
        </p>
        <h1 className="mt-3 text-3xl font-bold">Hệ thống Quản lý Kho tích hợp AI</h1>
        <p className="mt-3 text-slate-400">
          Frontend đang kết nối tới backend thật. Nghiệp vụ kho chỉ được triển khai sau khi
          baseline Phase 1 và permission matrix được audit.
        </p>

        <section className="mt-8 rounded-xl bg-slate-950 p-5">
          <h2 className="font-semibold">System health</h2>
          {health.isPending && <p className="mt-3 text-slate-400">Đang kiểm tra...</p>}
          {health.isError && (
            <p className="mt-3 text-red-400">Backend/Database chưa sẵn sàng.</p>
          )}
          {health.data && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <HealthItem label="Core" value={health.data.core} />
              <HealthItem label="Database" value={health.data.database} />
              <HealthItem label="AI" value={health.data.ai} />
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}

function HealthItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-200">{value}</dd>
    </div>
  );
}
