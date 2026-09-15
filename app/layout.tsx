import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FilmFund Africa",
  description: "De l’idée au financement pour les projets audiovisuels africains.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
