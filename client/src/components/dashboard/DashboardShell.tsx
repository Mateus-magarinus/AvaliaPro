"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  History,
  List,
  LogOut,
  Menu,
  PlayCircle,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { QuotaStatus, UserRecord } from "@/types/avaliapro";

type DashboardItem = "evaluations" | "history" | "profile" | "plans" | "support" | "admin";

type DashboardShellProps = {
  activeItem: DashboardItem;
  children: ReactNode;
  onLogout: () => void;
  onStartEvaluation: () => void;
};

const BASE_NAV_ITEMS: Array<{
  id: DashboardItem;
  label: string;
  href?: string;
  icon: ReactNode;
  adminOnly?: boolean;
}> = [
  { id: "evaluations", label: "Avaliações", href: "/", icon: <List className="h-5 w-5" /> },
  { id: "history", label: "Histórico", href: "/history", icon: <History className="h-5 w-5" /> },
  { id: "profile", label: "Perfil", icon: <UserIcon className="h-5 w-5" /> },
  { id: "plans", label: "Planos", href: "/billing", icon: <CreditCard className="h-5 w-5" /> },
  { id: "support", label: "Suporte", icon: <HelpCircle className="h-5 w-5" /> },
  { id: "admin", label: "Admin", href: "/admin", icon: <Shield className="h-5 w-5" />, adminOnly: true },
];

export default function DashboardShell({
  activeItem,
  children,
  onLogout,
  onStartEvaluation,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    if (!getAccessToken()) return;
    Promise.all([
      apiFetch<QuotaStatus>("/subscriptions/me").catch(() => null),
      apiFetch<UserRecord>("/users/me").catch(() => null),
    ]).then(([quotaData, userData]) => {
      if (quotaData) setQuota(quotaData);
      if (userData) setUserRole(userData.role);
    });
  }, []);

  const navItems = useMemo(
    () => BASE_NAV_ITEMS.filter((item) => !item.adminOnly || userRole === "admin"),
    [userRole],
  );

  const creditsLabel = useMemo(() => {
    if (!quota) return null;
    if (quota.searchesLimit === -1) return "Ilimitado";
    return `${quota.remaining} restantes`;
  }, [quota]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-28 lg:px-8">
          <div className="flex items-center gap-8">
            <Image src="/images/logo_rd.png" alt="AvaliaPro" width={82} height={82} priority className="h-16 w-auto object-contain" />
            <button
              className="rounded-md p-2 text-[#062650] hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-7 w-7" />
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {creditsLabel && (
              <Link
                href="/billing"
                className="hidden text-sm font-bold text-[#062650] hover:underline sm:inline"
              >
                {creditsLabel}
              </Link>
            )}
            <button
              onClick={onStartEvaluation}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#062650] px-4 py-3 text-sm font-semibold text-white sm:min-w-52"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Iniciar avaliação</span>
              <span className="sm:hidden">Iniciar</span>
            </button>
            <button
              onClick={onLogout}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#062650] text-[#062650]"
              aria-label="Sair"
            >
              <UserIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSidebarOpen(false)}>
          <aside
            className="flex h-full w-[min(86vw,360px)] flex-col justify-between bg-white px-7 py-8 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <div className="mb-20 flex items-center justify-between">
                <Image src="/images/logo_rd.png" alt="AvaliaPro" width={82} height={82} className="h-16 w-auto object-contain" />
                <button onClick={() => setSidebarOpen(false)} className="rounded-md p-2 text-[#062650]" aria-label="Fechar menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-4">
                {navItems.map((item) => (
                  <SidebarRow
                    key={item.id}
                    active={item.id === activeItem}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                ))}
              </nav>
            </div>

            <button onClick={onLogout} className="flex w-full items-center justify-between rounded-md px-1 py-3 text-left text-2xl font-bold text-[#062650]">
              <span className="flex items-center gap-3">
                <LogOut className="h-6 w-6" />
                Logout
              </span>
              <ChevronRight className="h-6 w-6" />
            </button>
          </aside>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:px-8 lg:py-10">
        <aside className="hidden lg:block">
          <div className="sticky top-36">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <SidebarRow
                  key={item.id}
                  active={item.id === activeItem}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  onNavigate={() => undefined}
                  size="compact"
                />
              ))}
            </nav>

            <button
              onClick={onLogout}
              className="mt-8 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-bold text-[#062650] hover:bg-slate-100"
            >
              <span className="flex items-center gap-2.5">
                <LogOut className="h-4 w-4" />
                Logout
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}

function SidebarRow({
  active,
  href,
  icon,
  label,
  onNavigate,
  size = "default",
}: {
  active: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  onNavigate: () => void;
  size?: "default" | "compact";
}) {
  const compact = size === "compact";
  const className = [
    "flex w-full items-center justify-between rounded-md text-left font-bold text-[#062650] transition",
    compact ? "px-3 py-2.5 text-sm" : "px-1 py-3 text-2xl",
    active ? "bg-[#e8f5f8]" : compact ? "hover:bg-slate-100" : "hover:bg-slate-100 hover:px-3",
    !href ? "opacity-60" : "",
  ].join(" ");

  const content = (
    <>
      <span className={compact ? "flex items-center gap-2.5" : "flex items-center gap-3"}>
        {icon}
        {label}
      </span>
      <ChevronRight className={compact ? "h-4 w-4" : "h-6 w-6"} />
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onNavigate} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" disabled className={className}>
      {content}
    </button>
  );
}
