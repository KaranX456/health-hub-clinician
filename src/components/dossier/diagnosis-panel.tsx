import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { DiagnosisEvidence, DifferentialDiagnosis } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/clinical-badges";
import { cn } from "@/lib/utils";
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
    <div className="space-y-4">
    <Stage1HypothesisPanel patientId={patientId} />
    <GenerateDifferentialCard patientId={patientId} />
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ranked differential diagnoses</CardTitle>
        <p className="text-xs text-muted-foreground">
          Evidence must be reviewed before a diagnosis can be confirmed.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PanelSkeleton rows={4} />
        ) : !data?.length ? (
          <EmptyState text="No differential diagnoses generated for this patient." />
        ) : (
          <div className="divide-y divide-border">
            {data.map((d) => (
              <DiagnosisRow key={d.id} diagnosis={d} doctorId={doctorId} patientId={patientId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

function Stage1HypothesisPanel({ patientId }: { patientId: string }) {
  const qc = useQueryClient();

  const symptoms = useQuery({
    queryKey: ["patient_symptoms", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptoms")
        .select("id, description, body_location, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const analyze = useMutation({
    mutationFn: async (symptomId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-stage1-hypotheses", {
        body: { symptom_id: symptomId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: { hypotheses_created: number; hypotheses_dispatched: number }) => {
      toast.success(
        `${data.hypotheses_created} new hypothesis(es) found, ${data.hypotheses_dispatched} scored`,
      );
      qc.invalidateQueries({ queryKey: ["differential_diagnoses", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Analyze symptom via community hypotheses</CardTitle>
        <p className="text-xs text-muted-foreground">
          Matches this patient's symptoms against lived-experience posts to suggest candidate
          conditions, then runs Stage 2 scoring automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {!symptoms.data?.length ? (
          <EmptyState text="No symptoms logged for this patient yet." />
        ) : (
          symptoms.data.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
              <span className="text-sm">
                {s.description}{s.body_location ? ` (${s.body_location})` : ""}
              </span>
              <Button size="sm" variant="outline" disabled={analyze.isPending} onClick={() => analyze.mutate(s.id)}>
                {analyze.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Analyze
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function GenerateDifferentialCard({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<{ condition_name: string; icd10_code: string }[]>([
    { condition_name: "", icd10_code: "" },
  ]);

  const suggestions = useQuery({
    queryKey: ["dx_suggestions", patientId],
    queryFn: async (): Promise<string[]> => {
      const [hx, sx] = await Promise.all([
        supabase.from("medical_history").select("condition_name").eq("patient_id", patientId),
        supabase.from("symptoms").select("description").eq("patient_id", patientId),
      ]);
      if (hx.error) throw hx.error;
      if (sx.error) throw sx.error;
      const names = [
        ...((hx.data ?? []) as { condition_name: string | null }[]).map((r) => r.condition_name),
        ...((sx.data ?? []) as { description: string | null }[]).map((r) => r.description),
      ].filter((v): v is string => !!v && v.trim().length > 0);
      return Array.from(new Set(names)).slice(0, 20);
    },
  });

  const addCandidate = (name: string) =>
    setRows((r) => {
      const empty = r.findIndex((x) => !x.condition_name.trim());
      if (empty >= 0) {
        return r.map((x, j) => (j === empty ? { ...x, condition_name: name } : x));
      }
      return [...r, { condition_name: name, icd10_code: "" }];
    });

  const run = useMutation({
    mutationFn: async () => {
      const candidates = rows
        .filter((r) => r.condition_name.trim())
        .map((r) =>
          r.icd10_code.trim()
            ? { condition_name: r.condition_name.trim(), icd10_code: r.icd10_code.trim() }
            : { condition_name: r.condition_name.trim() },
        );
      const { data, error } = await supabase.functions.invoke("stage2-score-diagnosis", {
        body: { patient_id: patientId, candidates },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Differential diagnosis generated");
      qc.invalidateQueries({ queryKey: ["differential_diagnoses", patientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!rows.some((r) => r.condition_name.trim())) {
      toast.error("Add at least one candidate condition");
      return;
    }
    run.mutate();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Generate differential diagnosis</CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter candidate conditions and run Stage 2 scoring against this patient&apos;s record.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!!suggestions.data?.length && (
          <div className="flex flex-wrap gap-2">
            {suggestions.data.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addCandidate(s)}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent"
              >
                + {s}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-40 flex-1"
                placeholder="Condition name"
                value={row.condition_name}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, j) => (j === i ? { ...x, condition_name: e.target.value } : x)),
                  )
                }
              />
              <Input
                className="w-32"
                placeholder="ICD-10 (opt.)"
                value={row.icd10_code}
                onChange={(e) =>
                  setRows((r) =>
                    r.map((x, j) => (j === i ? { ...x, icd10_code: e.target.value } : x)),
                  )
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove candidate"
                disabled={rows.length === 1}
                onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((r) => [...r, { condition_name: "", icd10_code: "" }])}
          >
            <Plus className="mr-1 size-4" />
            Add candidate
          </Button>
          <Button type="button" size="sm" disabled={run.isPending} onClick={submit}>
            {run.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Run Stage 2 scoring
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


const TIER_STYLES: Record<string, { dot: string; pill: string; label: string }> = {
  well_established: {
    dot: "bg-success",
    pill: "bg-success/15 text-success",
    label: "Well established",
  },
  moderate: {
    dot: "bg-warning",
    pill: "bg-warning/15 text-warning",
    label: "Moderate evidence",
  },
  rare_contested: {
    dot: "bg-destructive",
    pill: "bg-destructive/10 text-destructive",
    label: "Rare / contested",
  },
};

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

  const tier =
    (diagnosis.confidence_tier && TIER_STYLES[diagnosis.confidence_tier]) || {
      dot: "bg-muted-foreground",
      pill: "bg-muted text-muted-foreground",
      label: "Unrated",
    };
  const evidenceCount = evidence.data?.length;
  const probText =
    diagnosis.probability_score != null
      ? `${Math.round(Number(diagnosis.probability_score) * (Number(diagnosis.probability_score) <= 1 ? 100 : 1))}%`
      : "n/a";

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center gap-2 p-3 text-left transition-colors hover:bg-muted/40"
      >
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", tier.dot)} />
        <span className="font-medium">{diagnosis.condition_name ?? "Unnamed condition"}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", tier.pill)}>
          {tier.label}
        </span>
        {diagnosis.doctor_confirmed && <ToneBadge tone="info">Confirmed</ToneBadge>}
        {!diagnosis.disclosed_to_patient && (
          <ToneBadge tone="neutral">Undisclosed to patient</ToneBadge>
        )}
        <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
          {probText}
        </span>
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      <p className="px-3 pb-3 text-xs text-muted-foreground">
        {diagnosis.urgency ? `Urgency: ${diagnosis.urgency} · ` : ""}
        {evidenceCount != null
          ? `${evidenceCount} evidence ${evidenceCount === 1 ? "row" : "rows"} · `
          : ""}
        tap to expand
      </p>

      {expanded && (
        <div className="space-y-4 border-t border-border p-3">
          <div>
            <p className="text-xs text-muted-foreground">
              ICD-10 {diagnosis.icd10_code ?? "—"} · model probability {probText}{" "}
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
              className="w-full font-semibold"
              disabled={!reviewed || confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {reviewed ? "Confirm diagnosis" : "Review evidence to confirm"}
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