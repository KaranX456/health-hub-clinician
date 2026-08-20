import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { DifferentialDiagnosis, SoapNote } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToneBadge } from "@/components/clinical-badges";

export function SoapNotePanel({
  patientId,
  doctorId,
  diagnosis,
}: {
  patientId: string;
  doctorId: string;
  diagnosis: DifferentialDiagnosis;
}) {
  const qc = useQueryClient();
  const key = ["soap_notes", diagnosis.id, doctorId];

  const { data: note, isLoading } = useQuery({
    queryKey: key,
    queryFn: async (): Promise<SoapNote | null> => {
      const { data, error } = await supabase
        .from("soap_notes")
        .select(
          "id, patient_id, doctor_id, diagnosis_id, subjective, objective, assessment, plan, ai_drafted, finalized_at",
        )
        .eq("diagnosis_id", diagnosis.id)
        .eq("doctor_id", doctorId)
        .maybeSingle();
      if (error) throw error;
      return data as SoapNote | null;
    },
  });

  const [form, setForm] = useState({ subjective: "", objective: "", assessment: "", plan: "" });

  useEffect(() => {
    if (note) {
      setForm({
        subjective: note.subjective ?? "",
        objective: note.objective ?? "",
        assessment: note.assessment ?? "",
        plan: note.plan ?? "",
      });
    }
  }, [note]);

  const createDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("soap_notes").insert({
        patient_id: patientId,
        doctor_id: doctorId,
        diagnosis_id: diagnosis.id,
        ai_drafted: true,
        subjective: "Patient-reported symptoms captured by the AI companion.",
        objective: "Objective findings, vitals and lab results pending clinician entry.",
        assessment: `Working assessment: ${diagnosis.condition_name ?? "differential under review"}.`,
        plan: "Proposed plan: confirm diagnosis, review treatment options, arrange follow-up.",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("AI draft SOAP note created");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (finalize: boolean) => {
      const patch: Record<string, unknown> = { ...form };
      if (finalize) {
        patch.finalized_at = new Date().toISOString();
        patch.ai_drafted = false;
      }
      const { error } = await supabase.from("soap_notes").update(patch).eq("id", note!.id);
      if (error) throw error;
    },
    onSuccess: (_d, finalize) => {
      toast.success(finalize ? "SOAP note finalized" : "SOAP note saved");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">SOAP note assist</h4>
        {note?.ai_drafted && <ToneBadge tone="warn">AI draft</ToneBadge>}
        {note?.finalized_at && <ToneBadge tone="ok">Finalized</ToneBadge>}
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading note…</p>
      ) : !note ? (
        <Button size="sm" onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>
          Generate AI draft note
        </Button>
      ) : (
        <div className="space-y-3">
          {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <Label htmlFor={`${note.id}-${field}`} className="capitalize">
                {field}
              </Label>
              <Textarea
                id={`${note.id}-${field}`}
                rows={3}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
              Save draft
            </Button>
            <Button size="sm" onClick={() => save.mutate(true)} disabled={save.isPending || !!note.finalized_at}>
              Finalize
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}