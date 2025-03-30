"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Aqui você chamaria a rota de login real (ex.: /api/login) ou seu NestJS.
    try {
      // Exemplo de simulação:
      const response = { ok: true };
      if (!response.ok) {
        setError("Falha no login");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError("Erro de requisição");
    }
  }

  return (
    <main
      className="
        relative 
        min-h-screen 
        bg-cover 
        bg-center 
        flex 
        items-center 
        justify-center
        font-corbel
        px-4
      "
      style={{ backgroundImage: "url('/images/bg.jpg')" }}
    >
      {/* Overlay para dar contraste */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Container principal (logo + card) */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6">
          <Image
            src="/images/logo.png"
            alt="AvaliaPro"
            width={350}
            height={150}
            priority
          />
        </div>

        {/* Card de login */}
        <div
          className="
            w-full 
            rounded-2xl 
            bg-white/90 
            shadow-xl 
            backdrop-blur-sm 
            p-6
          "
        >
          {success ? (
            <p className="text-green-600 text-center mb-4">
              Login bem-sucedido!
            </p>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6 text-gray-800 text-left">
                Iniciar sessão
              </h2>
              {error && <p className="text-red-600 mb-4 text-left">{error}</p>}
              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="
                      block 
                      w-full 
                      border 
                      border-gray-300 
                      rounded-md 
                      p-2
                      focus:outline-none 
                      focus:ring-2 
                      focus:ring-brand-light
                    "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="block text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    className="
                      block 
                      w-full 
                      border 
                      border-gray-300 
                      rounded-md 
                      p-2
                      focus:outline-none 
                      focus:ring-2 
                      focus:ring-brand-light
                    "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    required
                  />
                </div>

                {/* Link: Esqueceu sua senha?
                <div className="mb-6 text-right">
                  <a
                    href="#"
                    className="text-sm text-brand-dark hover:underline"
                  >
                    Esqueceu sua senha?
                  </a>
                </div> */}

                <button
                  type="submit"
                  className="
                    mx-auto 
                    block
                    bg-brand-dark
                    text-white
                    px-8
                    py-3
                    rounded-full
                    font-semibold
                    text-base
                    hover:bg-brand-dark/90
                    transition-colors
                    duration-300
                    shadow-sm
                    w-full
                  "
                >
                  Iniciar sessão
                </button>
              </form>

              {/* Separador */}
              <div className="my-6 flex items-center">
                <hr className="flex-grow border-gray-300" />
                <span className="mx-2 text-gray-500">ou</span>
                <hr className="flex-grow border-gray-300" />
              </div>

              {/* Link para registrar */}
              <p className="text-center mt-4">
                <span className="text-base font-medium text-gray-700">
                  Não possui conta?{" "}
                </span>
                <a
                  href="/register"
                  className="text-base font-bold text-brand-dark hover:underline"
                >
                  Crie aqui
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
