import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { DifferentialDiagnosis } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FeedbackPanel({ diagnosis }: { diagnosis: DifferentialDiagnosis }) {
  const [open, setOpen] = useState(false);
  const empty = {
    condition_category: "",
    hit_criteria: "top_1",
    was_hit: false,
    doctor_confirmed_condition: diagnosis.condition_name ?? "",
  };
  const [form, setForm] = useState(empty);

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("validation_records").insert({
        diagnosis_id: diagnosis.id,
        condition_category: form.condition_category || null,
        hit_criteria: form.hit_criteria,
        was_hit: form.was_hit,
        doctor_confirmed_condition: form.doctor_confirmed_condition || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Validation record saved");
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Feedback loop</h4>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Record outcome"}
        </Button>
      </div>

      {open && (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`${diagnosis.id}-cat`}>Condition category</Label>
            <Input
              id={`${diagnosis.id}-cat`}
              value={form.condition_category}
              onChange={(e) => setForm((f) => ({ ...f, condition_category: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Hit criteria</Label>
            <Select
              value={form.hit_criteria}
              onValueChange={(v) => setForm((f) => ({ ...f, hit_criteria: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top_1">top_1</SelectItem>
                <SelectItem value="top_3">top_3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`${diagnosis.id}-hit`}
              checked={form.was_hit}
              onCheckedChange={(c) => setForm((f) => ({ ...f, was_hit: c === true }))}
            />
            <Label htmlFor={`${diagnosis.id}-hit`}>Was a hit</Label>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${diagnosis.id}-final`}>Doctor-confirmed condition</Label>
            <Input
              id={`${diagnosis.id}-final`}
              value={form.doctor_confirmed_condition}
              onChange={(e) =>
                setForm((f) => ({ ...f, doctor_confirmed_condition: e.target.value }))
              }
            />
          </div>

          <Button type="submit" size="sm" disabled={submit.isPending}>
            Save validation record
          </Button>
        </form>
      )}
    </section>
  );
}
