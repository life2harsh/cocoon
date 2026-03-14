"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginClient() {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    
    try {
      const { auth_url } = await api.auth.google();
      window.location.href = auth_url;
    } catch (err) {
      console.error("Auth error:", err);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-soft">Welcome</p>
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          Take a moment<br />
          <span className="text-accent">for yourself</span>
        </h1>
        <p className="text-sm text-ink-muted max-w-xs">
          A quiet space for your thoughts. No distractions, just you.
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative w-full max-w-xs overflow-hidden rounded-2xl bg-foreground px-6 py-4 transition-all duration-500 ease-out hover:scale-[1.02]"
      >
        <div className={`absolute inset-0 bg-gradient-to-r from-accent via-accent-strong to-accent transition-opacity duration-700 ${hovered ? 'opacity-100' : 'opacity-0'}`} />
        <div className="relative flex items-center justify-center gap-3">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className={`font-medium transition-colors duration-300 ${hovered ? 'text-white' : 'text-background'}`}>
            {loading ? 'Opening...' : 'Continue with Google'}
          </span>
        </div>
      </button>

      <p className="text-xs text-ink-soft">
        Your journal stays private. Always.
      </p>
    </div>
  );
}
