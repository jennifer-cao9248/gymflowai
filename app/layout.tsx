import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthControls } from "@/components/auth-controls";

export const metadata: Metadata = {
  title: "Voice-First Workout Logging",
  description: "MVP for logging sessions with Supabase and Next.js",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
              <div className="flex items-center gap-4">
                <Link className="text-lg font-semibold text-slate-900 no-underline" href="/members">
                  Workout Logger
                </Link>
                <div className="flex items-center gap-3 text-sm">
                  <Link href="/members">Members</Link>
                  <Link href="/sessions/new">New Session</Link>
                  <Link href="/history">History</Link>
                </div>
              </div>
              <AuthControls />
            </nav>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
