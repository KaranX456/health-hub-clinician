import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CommunityInsight } from "@/lib/db";
import { EmptyState, PanelSkeleton } from "./records-panels";

export function CommunityInsightsPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["community_contextual_insights", patientId],
    queryFn: async (): Promise<CommunityInsight[]> => {
      const { data, error } = await supabase
        .from("community_contextual_insights")
        .select("id, patient_id, pattern_summary, source_ref")
        .eq("patient_id", patientId);
      if (error) throw error;
      return (data ?? []) as CommunityInsight[];
    },
  });

  return (
    <section className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Community contextual insights</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Non-clinical signal collected from patient communities. Kept deliberately separate from the
        diagnostic panel.
      </p>

      {isLoading ? (
        <PanelSkeleton rows={2} />
      ) : !data?.length ? (
        <EmptyState text="No community insights for this patient." />
      ) : (
        <ul className="space-y-2">
          {data.map((c) => (
            <li key={c.id} className="rounded-md border border-dashed border-border bg-background p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Community pattern — not clinical evidence
              </p>
              <p className="mt-1 text-sm">{c.pattern_summary ?? "—"}</p>
              {c.source_ref && (
                <a
                  href={c.source_ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-primary underline underline-offset-2"
                >
                  Source reference
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
