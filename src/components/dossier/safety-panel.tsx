import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { AllergyFlag, InteractionFlag } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge, ToneBadge } from "@/components/clinical-badges";
import { EmptyState, PanelSkeleton } from "./records-panels";

export function SafetyPanel({ patientId }: { patientId: string }) {
  const qc = useQueryClient();

  const allergyFlags = useQuery({
    queryKey: ["allergy_flags", patientId],
    queryFn: async (): Promise<AllergyFlag[]> => {
      const { data, error } = await supabase
        .from("allergy_contraindication_flags")
        .select("id, patient_id, medication_id, allergy_id, detail, resolved")
        .eq("patient_id", patientId);
      if (error) throw error;
      return (data ?? []) as AllergyFlag[];
    },
  });

  const interactionFlags = useQuery({
    queryKey: ["interaction_flags", patientId],
    queryFn: async (): Promise<InteractionFlag[]> => {
      const { data, error } = await supabase
        .from("drug_interaction_flags")
        .select("id, patient_id, medication_id, source, severity, detail")
        .eq("patient_id", patientId);
      if (error) throw error;
      return (data ?? []) as InteractionFlag[];
    },
  });

  const resolveAllergyFlag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("allergy_contraindication_flags")
        .update({ resolved: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contraindication flag marked resolved");
      qc.invalidateQueries({ queryKey: ["allergy_flags", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loading = allergyFlags.isLoading || interactionFlags.isLoading;
  const openAllergy = (allergyFlags.data ?? []).filter((f) => !f.resolved);
  const resolvedAllergy = (allergyFlags.data ?? []).filter((f) => f.resolved);

  return (
    <Card className="border-2 border-destructive/40 bg-destructive/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <ShieldAlert className="size-5" /> Safety flags
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Allergy contraindications and drug interactions require clinician review.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <PanelSkeleton />
        ) : (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Allergy contraindications</h4>
              {!allergyFlags.data?.length ? (
                <EmptyState text="No allergy contraindication flags." />
              ) : (
                [...openAllergy, ...resolvedAllergy].map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{f.detail ?? "Potential contraindication"}</p>
                      <p className="text-xs text-muted-foreground">
                        medication {f.medication_id ?? "—"} · allergy {f.allergy_id ?? "—"}
                      </p>
                    </div>
                    {f.resolved ? (
                      <ToneBadge tone="ok">Resolved</ToneBadge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolveAllergyFlag.isPending}
                        onClick={() => resolveAllergyFlag.mutate(f.id)}
                      >
                        Mark resolved
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Drug interactions</h4>
              {!interactionFlags.data?.length ? (
                <EmptyState text="No drug interaction flags." />
              ) : (
                interactionFlags.data.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/50 bg-card p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={f.severity ?? null} />
                        <span className="text-xs text-muted-foreground">
                          source: {f.source ?? "—"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{f.detail ?? "Potential interaction"}</p>
                    </div>
                    <ResolveInteraction id={f.id} patientId={patientId} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ResolveInteraction({ id, patientId }: { id: string; patientId: string }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("drug_interaction_flags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interaction flag resolved");
      qc.invalidateQueries({ queryKey: ["interaction_flags", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      Mark resolved
    </Button>
  );
}