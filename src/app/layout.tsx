import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { Background } from "@/components/Background";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Job Tracker — AI-assisted application tracker",
  description: "Track every job & PFE application with AI-powered auto-fill.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen antialiased`}>
        <Background />
        <div className="relative z-10">
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}