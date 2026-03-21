import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SettingsView from "@/views/SettingsView";
import LoadingPage from "@/pages/LoadingPage";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        await api.auth.me();
        if (!cancelled) {
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (!ready) {
    return <LoadingPage label="Loading settings..." />;
  }

  return <SettingsView />;
}

