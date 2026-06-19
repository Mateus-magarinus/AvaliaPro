"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import type { QuotaStatus } from "@/types/avaliapro";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function BillingPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    loadQuota();
  }, [authReady]);

  async function loadQuota() {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch<QuotaStatus>("/subscriptions/me");
      setQuota(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Não foi possível carregar o plano.");
    } finally {
      setLoading(false);
    }
  }

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

  const unlimited = quota?.searchesLimit === -1;
  const pct = unlimited || !quota ? 0 : Math.min(100, Math.round((quota.searchesUsed / quota.searchesLimit) * 100));

  return (
    <DashboardShell activeItem="plans" onLogout={logout} onStartEvaluation={() => router.push("/")}>
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#062650]">Meu Plano</h1>
          <p className="mt-1 text-sm text-slate-600">Acompanhe o uso do seu plano e altere quando quiser.</p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-[#062650]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Carregando plano…</span>
          </div>
        ) : quota ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Plan card */}
            <div className="col-span-full rounded-xl border border-slate-200 bg-[#e8f5f8] p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-[#062650]" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plano atual</p>
                    <h2 className="text-2xl font-bold text-[#062650]">{quota.planName}</h2>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-md bg-[#062650] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  Alterar plano
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold text-[#062650]">
                  <span>Avaliações utilizadas</span>
                  <span>
                    {unlimited ? "Ilimitado" : `${quota.searchesUsed} / ${quota.searchesLimit}`}
                  </span>
                </div>

                {!unlimited && (
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full bg-[#062650] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {unlimited && (
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white/60">
                    <div className="h-full w-full rounded-full bg-[#062650]/30" />
                  </div>
                )}

                <p className="text-xs text-slate-600">
                  {unlimited
                    ? "Avaliações ilimitadas no seu plano Premium."
                    : `${quota.remaining} avaliação${quota.remaining !== 1 ? "ões" : ""} restante${quota.remaining !== 1 ? "s" : ""} no período atual.`}
                </p>
              </div>

              <div className="mt-5 rounded-md border border-[#9db8ca] bg-white px-4 py-3 text-sm text-[#062650]">
                <span className="font-semibold">Período:</span>{" "}
                Renova em {formatDate(quota.periodEnd)}
              </div>
            </div>

            {/* Quick action cards */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-[#062650]">Atualizar uso</h3>
              <p className="mb-4 text-xs text-slate-500">Recarregue os dados de uso do seu plano.</p>
              <button
                onClick={loadQuota}
                className="inline-flex items-center gap-2 rounded-md border border-[#062650] px-3 py-2 text-xs font-semibold text-[#062650] hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-1 text-sm font-semibold text-[#062650]">Precisa de mais?</h3>
              <p className="mb-4 text-xs text-slate-500">Veja os planos disponíveis e escolha o ideal para você.</p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-md bg-[#062650] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Ver planos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}
