import "../styles/globals.css";

export const metadata = {
  title: "AvaliaPro",
  description: "Plataforma para avaliação de imóveis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
