import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GourmetAI - Smart AI Recipe Platform & Chef Assistant",
  description: "Generate gourmet recipes from your pantry ingredients, scan your fridge, chat with our virtual chef, and organize your weekly meal schedules.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fcfbfa] dark:bg-[#09090b] text-[#1c1917] dark:text-[#f4f4f5] transition-colors duration-300">
        <Providers>
          <Navbar />
          <main className="flex flex-col flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 text-center text-xs text-zinc-400">
            <p>© {new Date().getFullYear()} GourmetAI. Empowering your culinary creativity with generative AI.</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

