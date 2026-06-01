import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PAWLY — La garde de votre animal, réinventée",
  description: "Trouvez des prestataires de garde vérifiés près de chez vous. Réservez en quelques clics, suivez la prestation en temps réel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="fr"
        suppressHydrationWarning
        className={`${fraunces.variable} ${dmSans.variable}`}
      >
        <body className="min-h-full antialiased">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
