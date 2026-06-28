import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — AvaliaPro",
  description: "Como o AvaliaPro trata seus dados pessoais conforme a LGPD.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-lg font-bold text-[#062650]">{title}</h2>
      <div className="space-y-2 text-sm leading-6 text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-[#062650]">Política de Privacidade</h1>
        <p className="mb-8 text-xs text-slate-500">
          Última atualização: 28/06/2026 · Elaborada conforme a Lei nº 13.709/2018 (LGPD).
        </p>

        <Section title="1. Quem é o controlador">
          <p>
            O AvaliaPro é o controlador dos dados pessoais tratados nesta plataforma. Para qualquer
            dúvida ou solicitação relacionada aos seus dados, entre em contato pelo e-mail{" "}
            <a className="font-medium text-[#062650] underline" href="mailto:contato@avaliapro.com">
              contato@avaliapro.com
            </a>
            .
          </p>
        </Section>

        <Section title="2. Quais dados coletamos">
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Dados de cadastro:</b> nome, e-mail e senha (armazenada de forma criptografada).</li>
            <li><b>Dados de uso:</b> avaliações criadas, filtros de busca e preferências de exibição.</li>
            <li>
              <b>Dados técnicos:</b> informações estritamente necessárias para autenticação e
              funcionamento da sessão.
            </li>
          </ul>
          <p>
            Os dados de imóveis e indicadores socioeconômicos exibidos têm origem em fontes públicas
            ou de terceiros (ex.: IBGE e bases imobiliárias parceiras) e não constituem dados
            pessoais dos usuários.
          </p>
        </Section>

        <Section title="3. Para que usamos seus dados">
          <p>
            Utilizamos seus dados exclusivamente para criar e manter sua conta, autenticar o acesso,
            gerar e armazenar suas avaliações e melhorar a experiência de uso. Não vendemos nem
            compartilhamos seus dados pessoais com terceiros para fins de marketing.
          </p>
        </Section>

        <Section title="4. Base legal">
          <p>
            O tratamento se fundamenta no <b>consentimento</b> fornecido no momento do cadastro e na{" "}
            <b>execução do contrato</b> de prestação do serviço (art. 7º, I e V, da LGPD).
          </p>
        </Section>

        <Section title="5. Por quanto tempo guardamos">
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir a conta, seus dados
            pessoais e avaliações são removidos de forma permanente dos nossos sistemas.
          </p>
        </Section>

        <Section title="6. Seus direitos (art. 18 da LGPD)">
          <p>
            Você pode, a qualquer momento, acessar, corrigir, exportar ou solicitar a exclusão dos
            seus dados. A correção do cadastro e a <b>exclusão da conta</b> podem ser feitas
            diretamente na página{" "}
            <Link className="font-medium text-[#062650] underline" href="/profile">
              Meu Perfil
            </Link>
            . Demais solicitações podem ser feitas pelo e-mail de contato acima.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            Utilizamos apenas armazenamento local essencial para manter sua sessão autenticada. Não
            empregamos cookies de rastreamento ou publicidade.
          </p>
        </Section>

        <div className="mt-10 border-t border-slate-200 pt-6 text-center">
          <Link className="text-sm font-semibold text-[#062650] hover:underline" href="/login">
            ← Voltar
          </Link>
        </div>
      </div>
    </main>
  );
}
