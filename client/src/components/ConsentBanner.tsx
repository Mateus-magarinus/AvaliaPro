"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "avaliapro:lgpd-consent";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ambiente sem localStorage — não mostra
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // ignora
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-xl bg-[#062650] px-5 py-4 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed">
          Utilizamos apenas dados essenciais para o funcionamento da plataforma, conforme a{" "}
          <Link href="/privacy" className="font-semibold underline">
            Política de Privacidade
          </Link>{" "}
          e a LGPD.
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#062650] transition-colors hover:bg-slate-100"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
