import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMT Navigator",
  description: "Интеллектуальный помощник для поиска кодов ММТ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              color: "#0F172A",
              fontSize: "14px",
            },
            duration: 2000,
          }}
        />
      </body>
    </html>
  );
}
