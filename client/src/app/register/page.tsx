"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("As senhas não conferem");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao registrar usuário");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError("Erro de requisição. Tente novamente.");
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

        {/* Card de registro */}
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
              Cadastro realizado com sucesso!
            </p>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6 text-gray-800 text-left">
                Criar conta
              </h2>
              {error && <p className="text-red-600 mb-4 text-left">{error}</p>}
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    className="
                      block 
                      w-full 
                      border 
                      border-gray-300 
                      rounded-md 
                      p-2 pl-9
                      focus:outline-none 
                      focus:ring-2 
                      focus:ring-brand-light
                    "
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

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
                    placeholder="voce@exemplo.com"
                    required
                  />
                </div>

                <div className="mb-4">
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
                    placeholder="********"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-gray-700 mb-1">
                    Confirmar Senha
                  </label>
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                </div>

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
                    shadow-md
                  "
                >
                  Criar
                </button>
              </form>

              {/* Exemplo de redes sociais (remova se não quiser) */}
              <div className="my-6 flex items-center">
                <hr className="flex-grow border-gray-300" />
                <span className="mx-2 text-gray-500">ou</span>
                <hr className="flex-grow border-gray-300" />
              </div>

              <p className="text-center mt-4">
                <a
                  href="/login"
                  className="
                    text-brand-dark
                    text-lg
                    font-bold
                    hover:underline
                  "
                >
                  Login
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
