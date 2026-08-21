import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import type { CrisisEscalation, Medication, WellbeingCheckin } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge, ToneBadge } from "@/components/clinical-badges";
import { EmptyState, PanelSkeleton, SymptomsPanel } from "./records-panels";

export function LongitudinalMonitoringPanel({ patientId }: { patientId: string }) {
  const crises = useQuery({
    queryKey: ["crisis_escalations", patientId],
    queryFn: async (): Promise<CrisisEscalation[]> => {
      const { data, error } = await supabase
        .from("crisis_escalations")
        .select("id, patient_id, severity, status")
        .eq("patient_id", patientId);
      if (error) throw error;
      return (data ?? []) as CrisisEscalation[];
    },
  });

  const checkins = useQuery({
    queryKey: ["wellbeing_checkins", patientId],
    queryFn: async (): Promise<WellbeingCheckin[]> => {
      const { data, error } = await supabase
        .from("wellbeing_checkins")
        .select("id, patient_id, mood_rating, notes, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as WellbeingCheckin[];
    },
  });

  const meds = useQuery({
    queryKey: ["active_medications", patientId],
    queryFn: async (): Promise<Medication[]> => {
      const { data, error } = await supabase
        .from("medications")
        .select("id, patient_id, drug_name, dosage, frequency, active")
        .eq("patient_id", patientId)
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as Medication[];
    },
  });

  const openCrises = (crises.data ?? []).filter(
    (c) => (c.status ?? "").toLowerCase() !== "resolved",
  );

  const chartData = (checkins.data ?? [])
    .filter((c) => c.mood_rating != null)
    .map((c) => ({
      date: c.created_at ? new Date(c.created_at).toLocaleDateString() : "—",
      mood: Number(c.mood_rating),
    }));

  return (
    <div className="space-y-4">
      {openCrises.length > 0 && (
        <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">
              {openCrises.length} open crisis escalation{openCrises.length > 1 ? "s" : ""}
            </h3>
          </div>
          <ul className="mt-2 space-y-1">
            {openCrises.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                <SeverityBadge severity={c.severity ?? null} />
                <ToneBadge tone="warn">{c.status ?? "open"}</ToneBadge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mood trend</CardTitle>
          <p className="text-xs text-muted-foreground">From patient wellbeing check-ins.</p>
        </CardHeader>
        <CardContent>
          {checkins.isLoading ? (
            <PanelSkeleton rows={3} />
          ) : !chartData.length ? (
            <EmptyState text="No wellbeing check-ins recorded." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <SymptomsPanel patientId={patientId} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adherence context</CardTitle>
          <p className="text-xs text-muted-foreground">Currently active medications.</p>
        </CardHeader>
        <CardContent>
          {meds.isLoading ? (
            <PanelSkeleton rows={2} />
          ) : !meds.data?.length ? (
            <EmptyState text="No active medications." />
          ) : (
            <ul className="space-y-2">
              {meds.data.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm"
                >
                  <span className="font-medium">{m.drug_name ?? "—"}</span>
                  <span className="text-muted-foreground">
                    {m.dosage ?? "—"} · {m.frequency ?? "—"}
                  </span>
                  <ToneBadge tone="ok">Active</ToneBadge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
