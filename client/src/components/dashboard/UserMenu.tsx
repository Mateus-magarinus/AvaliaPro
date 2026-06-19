"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, CreditCard, LogOut, Shield, User as UserIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { UserRecord } from "@/types/avaliapro";

export default function UserMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserRecord | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    apiFetch<UserRecord>("/users/me")
      .then(setUser)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const initials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-[#062650] py-1 pl-1 pr-2 text-[#062650] transition hover:bg-slate-50"
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#062650] text-sm font-bold text-white">
          {initials || <UserIcon className="h-5 w-5" />}
        </span>
        <ChevronDown className={["h-4 w-4 transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-bold text-[#062650]">{user?.name || "Minha conta"}</p>
            {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            {user?.role === "admin" && (
              <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                Administrador
              </span>
            )}
          </div>
          <nav className="py-1">
            <MenuLink href="/profile" icon={<UserIcon className="h-4 w-4" />} label="Meu perfil" onClick={() => setOpen(false)} />
            <MenuLink href="/billing" icon={<CreditCard className="h-4 w-4" />} label="Planos" onClick={() => setOpen(false)} />
            {user?.role === "admin" && (
              <MenuLink href="/admin" icon={<Shield className="h-4 w-4" />} label="Admin" onClick={() => setOpen(false)} />
            )}
          </nav>
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#062650] hover:bg-slate-50"
    >
      {icon}
      {label}
    </Link>
  );
}
