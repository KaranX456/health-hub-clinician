import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-doctor";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Doctor Dashboard — AI Health Companion" },
      {
        name: "description",
        content:
          "Clinician workspace for reviewing patient dossiers, ranked differentials, safety flags and longitudinal monitoring.",
      },
      { property: "og:title", content: "Doctor Dashboard — AI Health Companion" },
      {
        property: "og:description",
        content:
          "Clinician workspace for patient dossiers, ranked differentials and safety flags.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: session ? "/patients" : "/auth", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
