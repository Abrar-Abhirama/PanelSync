import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Comicly",
  description: "Read your favorite manga and manhwa in one beautiful place.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import Header from "./components/Header";
import { AuthProvider } from "./contexts/AuthContext";
import GlobalLoginModal from "./components/GlobalLoginModal";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a0c] overflow-x-hidden">
        <AuthProvider>
          <Suspense fallback={<div className="h-16 border-b border-white/5 bg-[#0a0a0c]"></div>}>
            <Header />
          </Suspense>
          {children}
          <GlobalLoginModal />
        </AuthProvider>
      </body>
    </html>
  );
}
