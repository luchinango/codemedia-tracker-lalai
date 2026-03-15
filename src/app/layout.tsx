import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { WellnessAlerts } from "@/components/wellness-alerts";
import { GlobalTimer } from "@/components/global-timer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lalai - CodeMedia Tracker",
  description: "Gestión de proyectos, control de horas y cálculo de costos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
          <WellnessAlerts />
          <GlobalTimer />
        </div>
      </body>
    </html>
  );
}
