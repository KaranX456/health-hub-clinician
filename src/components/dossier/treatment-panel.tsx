import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { DifferentialDiagnosis, TreatmentOption } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToneBadge } from "@/components/clinical-badges";
import { EmptyState, PanelSkeleton } from "./records-panels";

export function TreatmentOptionsPanel({
  diagnosis,
  doctorId,
}: {
  diagnosis: DifferentialDiagnosis;
  doctorId: string;
}) {
  const qc = useQueryClient();
  const key = ["treatment_options", diagnosis.id];
  const [form, setForm] = useState({
    drug_name: "",
    standard_dosing_reference: "",
    guideline_source: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: !!diagnosis.doctor_confirmed,
    queryFn: async (): Promise<TreatmentOption[]> => {
      const { data, error } = await supabase
        .from("treatment_options")
        .select(
          "id, diagnosis_id, drug_name, standard_dosing_reference, guideline_source, doctor_selected, selected_by, selected_at",
        )
        .eq("diagnosis_id", diagnosis.id);
      if (error) throw error;
      return (data ?? []) as TreatmentOption[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("treatment_options").insert({
        diagnosis_id: diagnosis.id,
        drug_name: form.drug_name,
        standard_dosing_reference: form.standard_dosing_reference || null,
        guideline_source: form.guideline_source || null,
        doctor_selected: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Treatment option added");
      setForm({ drug_name: "", standard_dosing_reference: "", guideline_source: "" });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const select = useMutation({
    mutationFn: async (optionId: string) => {
      const clear = await supabase
        .from("treatment_options")
        .update({ doctor_selected: false, selected_by: null, selected_at: null })
        .eq("diagnosis_id", diagnosis.id);
      if (clear.error) throw clear.error;
      const { error } = await supabase
        .from("treatment_options")
        .update({
          doctor_selected: true,
          selected_by: doctorId,
          selected_at: new Date().toISOString(),
        })
        .eq("id", optionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Treatment option selected");
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!diagnosis.doctor_confirmed) {
    return (
      <section className="rounded-md border border-dashed border-border p-3">
        <h4 className="text-sm font-semibold">Treatment options</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Available after diagnosis is confirmed.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-border bg-background p-3">
      <h4 className="mb-3 text-sm font-semibold">Treatment options</h4>

      {isLoading ? (
        <PanelSkeleton rows={2} />
      ) : !data?.length ? (
        <EmptyState text="No treatment options recorded for this diagnosis." />
      ) : (
        <ul className="space-y-2">
          {data.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
            >
              <span className="font-medium">{o.drug_name ?? "—"}</span>
              <span className="text-xs text-muted-foreground">
                {o.standard_dosing_reference ?? "no dosing reference"} ·{" "}
                {o.guideline_source ?? "no guideline source"}
              </span>
              {o.doctor_selected ? (
                <ToneBadge tone="ok">Selected</ToneBadge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  disabled={select.isPending}
                  onClick={() => select.mutate(o.id)}
                >
                  Select
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 grid gap-2 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.drug_name.trim()) {
            toast.error("Drug name is required");
            return;
          }
          add.mutate();
        }}
      >
        <Input
          placeholder="Drug name"
          value={form.drug_name}
          onChange={(e) => setForm((f) => ({ ...f, drug_name: e.target.value }))}
        />
        <Input
          placeholder="Standard dosing reference"
          value={form.standard_dosing_reference}
          onChange={(e) => setForm((f) => ({ ...f, standard_dosing_reference: e.target.value }))}
        />
        <Input
          placeholder="Guideline source"
          value={form.guideline_source}
          onChange={(e) => setForm((f) => ({ ...f, guideline_source: e.target.value }))}
        />
        <Button type="submit" size="sm" disabled={add.isPending} className="sm:col-span-3 sm:w-fit">
          Add option
        </Button>
      </form>
    </section>
  );
}
