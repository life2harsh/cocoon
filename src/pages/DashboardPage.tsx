import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardView from "@/views/DashboardView";
import LoadingPage from "@/pages/LoadingPage";
import { api, type Journal } from "@/lib/api";

export default function DashboardPage({ activeView = "home" }: { activeView?: "home" | "journal" }) {
  const [journals, setJournals] = useState<Journal[] | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await api.journals.list();
        if (!cancelled) {
          setJournals(result);
        }
      } catch {
        if (!cancelled) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (!journals) {
    return <LoadingPage label="Loading your notebooks..." />;
  }

  return (
    <DashboardView
      journals={journals}
      activeView={activeView}
    />
  );
}
