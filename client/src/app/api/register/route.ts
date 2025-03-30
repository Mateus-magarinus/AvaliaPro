// src/app/api/register/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validação simples
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Aqui você poderia enviar os dados ao seu back-end (NestJS)
    // ou inserir diretamente em um banco de dados se estiver usando Prisma/Mongoose etc.

    // Simulação de sucesso
    return NextResponse.json({ message: "Usuário registrado com sucesso" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 500 }
    );
  }
}
