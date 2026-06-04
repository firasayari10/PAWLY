// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import NotificationHandler from "@/components/NotificationHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PAWLY - La garde d'animaux réinventée",
  description: "Trouvez des gardiens vérifiés pour vos animaux de compagnie",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ✅ 添加 afterSignOutUrl 到 ClerkProvider
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="fr"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <NotificationHandler />
        </body>
      </html>
    </ClerkProvider>
  );
}