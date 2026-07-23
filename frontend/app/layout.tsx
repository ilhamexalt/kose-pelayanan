import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "One Portal - KOSE",
  description: "Portal antrean dan layanan konsumen Otoritas Jasa Keuangan",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthProvider } from "@/contexts/AuthContext";

import MaintenanceOverlay from "@/components/MaintenanceOverlay";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={` ${poppins.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <MaintenanceOverlay>
              <main className="flex-1 flex flex-col">
                {children}
              </main>
            </MaintenanceOverlay>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

