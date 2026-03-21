import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import JournalView from "@/views/JournalView";
import LoadingPage from "@/pages/LoadingPage";
import { api, type Entry, type Journal, type Member, type User } from "@/lib/api";

type JournalPayload = {
  user: User;
  journal: Journal;
  members: Member[];
  entries: Entry[];
};

export default function JournalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<JournalPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        navigate("/app", { replace: true });
        return;
      }

      try {
        const [user, journalData] = await Promise.all([api.auth.me(), api.journals.get(id)]);
        if (!cancelled) {
          setData({
            user,
            journal: journalData.journal,
            members: journalData.members,
            entries: journalData.entries,
          });
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
  }, [id, location.pathname, navigate]);

  if (!data) {
    return <LoadingPage label="Opening your journal..." />;
  }

  return (
    <JournalView
      journal={data.journal}
      entries={data.entries}
      members={data.members}
      user={data.user}
    />
  );
}
