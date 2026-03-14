"use client";

import { Suspense } from "react";
import LoginClient from "@/app/login/LoginClient";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden warm-shell">
      <div className="warm-glow warm-glow-1" />
      <div className="warm-glow warm-glow-2" />
      <div className="warm-glow warm-glow-3" />
      
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-8">
        <div className="mb-8 flex justify-end">
          <ThemeToggle />
        </div>
        <Suspense>
          <LoginClient />
        </Suspense>
      </div>
    </main>
  );
}
