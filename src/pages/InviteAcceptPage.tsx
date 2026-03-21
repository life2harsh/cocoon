import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingPage from "@/pages/LoadingPage";
import { api } from "@/lib/api";

export default function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function acceptInvite() {
      if (!code) {
        navigate("/app", { replace: true });
        return;
      }

      try {
        const result = await api.invites.accept(code);
        if (!cancelled) {
          navigate(`/app/journals/${result.journalId}`, { replace: true });
        }
      } catch {
        if (!cancelled) {
          navigate(`/login?next=${encodeURIComponent(`/app/invite/${code}`)}`, { replace: true });
        }
      }
    }

    void acceptInvite();
    return () => {
      cancelled = true;
    };
  }, [code, navigate]);

  return <LoadingPage label="Accepting invitation..." />;
}
