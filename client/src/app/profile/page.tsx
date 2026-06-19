"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CreditCard, KeyRound, Loader2, Save, Trash2, UserCog } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch, ApiError } from "@/lib/api";
import { clearAccessToken, getAccessToken } from "@/lib/auth";
import type { QuotaStatus, UserRecord } from "@/types/avaliapro";

export default function ProfilePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  // dados da conta
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // senha
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // exclusão
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    Promise.all([
      apiFetch<UserRecord>("/users/me"),
      apiFetch<QuotaStatus>("/subscriptions/me").catch(() => null),
    ])
      .then(([me, q]) => {
        setUser(me);
        setName(me.name ?? "");
        setEmail(me.email ?? "");
        if (q) setQuota(q);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [authReady, router]);

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  async function saveAccount() {
    setAccountMsg(null);
    if (name.trim().length < 3) {
      setAccountMsg({ type: "err", text: "O nome precisa ter ao menos 3 caracteres." });
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setAccountMsg({ type: "err", text: "Informe um e-mail válido." });
      return;
    }
    try {
      setSavingAccount(true);
      const updated = await apiFetch<UserRecord>("/users/me", {
        method: "PATCH",
        body: { name: name.trim(), email: email.trim() },
      });
      setUser((u) => (u ? { ...u, name: updated.name, email: updated.email } : u));
      setAccountMsg({ type: "ok", text: "Dados atualizados com sucesso." });
    } catch (err) {
      setAccountMsg({ type: "err", text: err instanceof Error ? err.message : "Não foi possível salvar." });
    } finally {
      setSavingAccount(false);
    }
  }

  async function savePassword() {
    setPasswordMsg(null);
    if (password.length < 8) {
      setPasswordMsg({ type: "err", text: "A senha deve ter ao menos 8 caracteres." });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "As senhas não coincidem." });
      return;
    }
    try {
      setSavingPassword(true);
      await apiFetch("/users/me", { method: "PATCH", body: { password } });
      setPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "ok", text: "Senha alterada com sucesso." });
    } catch (err) {
      setPasswordMsg({ type: "err", text: err instanceof Error ? err.message : "Não foi possível alterar a senha." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteAccount() {
    try {
      setDeleting(true);
      setDeleteErr("");
      await apiFetch("/users/me", { method: "DELETE" });
      clearAccessToken();
      router.replace("/login");
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : "Não foi possível excluir a conta.");
      setDeleting(false);
    }
  }

  if (!authReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-[#062650]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    );
  }

  return (
    <DashboardShell activeItem="profile" onLogout={logout} onStartEvaluation={() => router.push("/")}>
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <UserCog className="h-7 w-7 text-[#062650]" />
          <div>
            <h1 className="text-2xl font-bold text-[#062650]">Meu perfil</h1>
            <p className="text-sm text-slate-600">Gerencie seus dados, senha e conta.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-[#062650]">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">Carregando…</span>
          </div>
        ) : (
          <>
            {/* Dados da conta */}
            <Card title="Dados da conta">
              {accountMsg && <Banner msg={accountMsg} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput label="Nome" value={name} onChange={setName} />
                <FieldInput label="E-mail" type="email" value={email} onChange={setEmail} />
              </div>
              {user && (
                <p className="mt-3 text-xs text-slate-500">
                  Função: <span className="font-semibold text-[#062650]">{user.role === "admin" ? "Administrador" : "Usuário"}</span>
                  {user.createdAt && (
                    <> · Conta criada em {new Date(user.createdAt).toLocaleDateString("pt-BR")}</>
                  )}
                </p>
              )}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={saveAccount}
                  disabled={savingAccount}
                  className="inline-flex items-center gap-2 rounded-md bg-[#062650] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </Card>

            {/* Senha */}
            <Card title="Alterar senha" icon={<KeyRound className="h-5 w-5 text-[#062650]" />}>
              {passwordMsg && <Banner msg={passwordMsg} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput label="Nova senha" type="password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
                <FieldInput label="Confirmar nova senha" type="password" value={confirmPassword} onChange={setConfirmPassword} />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={savePassword}
                  disabled={savingPassword || !password}
                  className="inline-flex items-center gap-2 rounded-md bg-[#062650] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Alterar senha
                </button>
              </div>
            </Card>

            {/* Plano */}
            <Card title="Plano" icon={<CreditCard className="h-5 w-5 text-[#062650]" />}>
              {quota ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-700">
                    Plano atual: <span className="font-semibold text-[#062650]">{quota.planName}</span>
                    <br />
                    Uso:{" "}
                    <span className="font-semibold text-[#062650]">
                      {quota.searchesLimit === -1
                        ? "ilimitado"
                        : `${quota.searchesUsed} / ${quota.searchesLimit} avaliações`}
                    </span>
                  </div>
                  <Link
                    href="/billing"
                    className="inline-flex items-center gap-2 rounded-md border border-[#062650] px-4 py-2.5 text-sm font-semibold text-[#062650] hover:bg-slate-50"
                  >
                    Gerenciar plano
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Não foi possível carregar o plano.</p>
              )}
            </Card>

            {/* Zona de perigo */}
            <Card title="Zona de perigo" danger>
              <p className="mb-4 text-sm text-slate-600">
                Excluir a conta remove permanentemente seus dados. Esta ação não pode ser desfeita.
              </p>
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Excluir minha conta
              </button>
            </Card>
          </>
        )}
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#062650]">Excluir conta</h2>
            <p className="mt-3 text-sm text-slate-700">
              Tem certeza? Todos os seus dados serão removidos permanentemente.
            </p>
            {deleteErr && <p className="mt-3 text-sm text-red-600">{deleteErr}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteErr("");
                }}
                disabled={deleting}
                className="flex-1 rounded-md border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-red-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Card({
  title,
  icon,
  danger,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={["rounded-xl border bg-white p-6 shadow-sm", danger ? "border-red-200" : "border-slate-200"].join(" ")}>
      <h2 className={["mb-4 flex items-center gap-2 text-base font-bold", danger ? "text-red-700" : "text-[#062650]"].join(" ")}>
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Banner({ msg }: { msg: { type: "ok" | "err"; text: string } }) {
  return (
    <div
      className={[
        "mb-4 rounded-md border px-3 py-2 text-sm",
        msg.type === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      {msg.text}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#062650]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#9db8ca]"
      />
    </label>
  );
}
