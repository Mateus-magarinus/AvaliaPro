"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Users } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import type { AdminUserView, UserRecord } from "@/types/avaliapro";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const PLAN_BADGE: Record<string, string> = {
  Básico: "bg-slate-100 text-slate-700",
  Padrão: "bg-blue-100 text-blue-800",
  Premium: "bg-amber-100 text-amber-800",
};

export default function AdminPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }

    // check role before rendering
    apiFetch<UserRecord>("/users/me")
      .then((me) => {
        if (me.role !== "admin") {
          router.replace("/");
          return;
        }
        setAuthReady(true);
      })
      .catch(() => {
        clearAccessToken();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    apiFetch<AdminUserView[]>("/admin/users")
      .then(setUsers)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("Não foi possível carregar os usuários.");
      })
      .finally(() => setLoading(false));
  }, [authReady, router]);

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-[#062650]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <DashboardShell activeItem="admin" onLogout={logout} onStartEvaluation={() => router.push("/")}>
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-[#062650]" />
          <div>
            <h1 className="text-2xl font-bold text-[#062650]">Painel Administrativo</h1>
            <p className="text-sm text-slate-600">Visão geral dos usuários e seus planos.</p>
          </div>
        </div>

        {/* summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total de usuários" value={users.length} />
          <StatCard
            label="Plano Básico"
            value={users.filter((u) => u.planSlug === "basic" || u.plan === "Básico").length}
          />
          <StatCard
            label="Planos pagos"
            value={users.filter((u) => u.planSlug === "standard" || u.planSlug === "premium").length}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-[#062650]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Carregando usuários…</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-[#062650] text-white">
                <tr>
                  {["ID", "Nome", "E-mail", "Função", "Plano", "Avaliações", "Fim do período", "Cadastro"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => (
                    <tr key={user.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-3 text-slate-500">{user.id}</td>
                      <td className="px-4 py-3 font-medium text-[#062650]">{user.name}</td>
                      <td className="px-4 py-3 text-slate-700">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {user.role === "admin" ? "Admin" : "Usuário"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            PLAN_BADGE[user.plan] ?? "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                        {user.searchesUsed}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(user.periodEnd)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#062650]">{value}</p>
    </div>
  );
}
