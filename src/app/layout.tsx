import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "Aegis Admin",
  description: "Aegis Financial Services lead management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-page text-text-primary">
        {children}
      </body>
    </html>
  );
}
