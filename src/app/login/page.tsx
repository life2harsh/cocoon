import { Suspense } from "react";
import LoginClient from "@/app/login/LoginClient";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden cocoon-shell">
      <div className="pointer-events-none absolute -top-24 left-12 h-64 w-64 rounded-full cocoon-glow-warm blur-3xl animate-glow motion-reduce:animate-none" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-72 w-72 rounded-full cocoon-glow-sage blur-3xl animate-float motion-reduce:animate-none" />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <div className="mb-6 flex justify-end">
          <ThemeToggle />
        </div>
        <Suspense>
          <LoginClient />
        </Suspense>
      </div>
    </main>
  );
}
