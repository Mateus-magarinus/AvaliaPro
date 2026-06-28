import "../styles/globals.css";
import ConsentBanner from "@/components/ConsentBanner";

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
      <body>
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
