import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { DiagnosisEvidence, DifferentialDiagnosis } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge, ToneBadge, UrgencyBadge } from "@/components/clinical-badges";
import { EmptyState, PanelSkeleton } from "./records-panels";
import { SoapNotePanel } from "./soap-panel";
import { TreatmentOptionsPanel } from "./treatment-panel";
import { FeedbackPanel } from "./feedback-panel";

export function DiagnosisPanel({
  patientId,
  doctorId,
}: {
  patientId: string;
  doctorId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["differential_diagnoses", patientId],
    queryFn: async (): Promise<DifferentialDiagnosis[]> => {
      const { data, error } = await supabase
        .from("differential_diagnoses")
        .select(
          "id, patient_id, rank, condition_name, icd10_code, probability_score, confidence_tier, urgency, disclosed_to_patient, doctor_confirmed, confirmed_at, confirmed_by",
        )
        .eq("patient_id", patientId)
        .order("rank", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DifferentialDiagnosis[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ranked differential diagnoses</CardTitle>
        <p className="text-xs text-muted-foreground">
          Evidence must be reviewed before a diagnosis can be confirmed.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <PanelSkeleton rows={4} />
        ) : !data?.length ? (
          <EmptyState text="No differential diagnoses generated for this patient." />
        ) : (
          data.map((d) => (
            <DiagnosisRow key={d.id} diagnosis={d} doctorId={doctorId} patientId={patientId} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DiagnosisRow({
  diagnosis,
  doctorId,
  patientId,
}: {
  diagnosis: DifferentialDiagnosis;
  doctorId: string;
  patientId: string;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const evidence = useQuery({
    queryKey: ["diagnosis_evidence", diagnosis.id],
    enabled: expanded,
    queryFn: async (): Promise<DiagnosisEvidence[]> => {
      const { data, error } = await supabase
        .from("diagnosis_evidence")
        .select("id, diagnosis_id, source, contribution_weight, detail")
        .eq("diagnosis_id", diagnosis.id)
        .order("contribution_weight", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DiagnosisEvidence[];
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("differential_diagnoses")
        .update({
          doctor_confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmed_by: doctorId,
        })
        .eq("id", diagnosis.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diagnosis confirmed");
      qc.invalidateQueries({ queryKey: ["differential_diagnoses", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) setReviewed(true);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
          #{diagnosis.rank ?? "—"}
        </span>
        <span className="font-medium">{diagnosis.condition_name ?? "Unnamed condition"}</span>
        <TierBadge tier={diagnosis.confidence_tier} />
        <UrgencyBadge urgency={diagnosis.urgency} />
        {diagnosis.doctor_confirmed && <ToneBadge tone="info">Confirmed</ToneBadge>}
        {!diagnosis.disclosed_to_patient && (
          <ToneBadge tone="neutral">Undisclosed to patient</ToneBadge>
        )}
        <Button size="sm" variant="outline" className="ml-auto" onClick={toggle}>
          {expanded ? <ChevronDown className="mr-1 size-4" /> : <ChevronRight className="mr-1 size-4" />}
          Why?
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border p-3">
          <div>
            <p className="text-xs text-muted-foreground">
              ICD-10 {diagnosis.icd10_code ?? "—"} · model probability{" "}
              {diagnosis.probability_score != null
                ? `${Math.round(Number(diagnosis.probability_score) * (Number(diagnosis.probability_score) <= 1 ? 100 : 1))}%`
                : "n/a"}{" "}
              (supporting signal only)
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Evidence</h4>
            {evidence.isLoading ? (
              <PanelSkeleton rows={2} />
            ) : !evidence.data?.length ? (
              <EmptyState text="No evidence rows linked to this diagnosis." />
            ) : (
              evidence.data.map((e) => (
                <div key={e.id} className="rounded-md border border-border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="info">{e.source ?? "unknown source"}</ToneBadge>
                    {e.contribution_weight != null && (
                      <span className="text-xs text-muted-foreground">
                        weight {e.contribution_weight}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{e.detail ?? "—"}</p>
                </div>
              ))
            )}
          </div>

          {!diagnosis.doctor_confirmed ? (
            <Button
              size="sm"
              disabled={!reviewed || confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm diagnosis
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Confirmed {diagnosis.confirmed_at ? new Date(diagnosis.confirmed_at).toLocaleString() : ""}
            </p>
          )}

          <SoapNotePanel patientId={patientId} doctorId={doctorId} diagnosis={diagnosis} />
          <TreatmentOptionsPanel diagnosis={diagnosis} doctorId={doctorId} />
          <FeedbackPanel diagnosis={diagnosis} />
        </div>
      )}
    </div>
  );
}