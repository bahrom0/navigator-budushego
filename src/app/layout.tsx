import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "NCT Navigator",
  description:
    "Подбор кодов НЦТ, объяснение выбора и план подготовки в одном спокойном интерфейсе.",
};

const themeBootstrapScript = `(() => {
  const key = "mmt-theme-mode";
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  let mode = "system";
  try {
    const stored = localStorage.getItem(key);
    if (stored === "light" || stored === "dark" || stored === "system") {
      mode = stored;
    }
  } catch (error) {}
  const theme = mode === "system" ? system : mode;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card-bg)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--foreground)",
              fontSize: "14px",
            },
            duration: 2000,
          }}
        />
      </body>
    </html>
  );
}
