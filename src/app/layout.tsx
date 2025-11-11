import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import ClientThemeProvider from "@/components/ThemeProvider";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import ReactQueryProvider from "@/provider/reactQueryProvider";
import { AuthProvider } from "@/provider/authProvider";
import MuiLocalizationProvider from "@/provider/MuiLocalizationProvider";
import I18nProvider from "./i18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Feria del Millón - Admin",
  description: "Panel de administración de Feria del Millón",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"> {/* 👈 ahora controlado por i18n */}
      <head>
        <link rel="shortcut icon" href="/sweeps.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          <ReactQueryProvider>
            <MuiLocalizationProvider>
              <ClientThemeProvider>
                <AuthProvider>
                  <AuthenticatedLayout>{children}</AuthenticatedLayout>
                </AuthProvider>
              </ClientThemeProvider>
            </MuiLocalizationProvider>
          </ReactQueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
