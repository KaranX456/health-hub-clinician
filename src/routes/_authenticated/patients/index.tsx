import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/clinical-badges";
import { EmptyState, PanelSkeleton } from "@/components/dossier/records-panels";
import { useSession } from "@/hooks/use-doctor";

export const Route = createFileRoute("/_authenticated/patients/")({
  component: RosterPage,
});

interface RosterRow {
  patient: Patient;
  openCrises: number;
  needsAttention: number;
}

function RosterPage() {
  const { userId } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["roster", userId],
    enabled: !!userId,
    queryFn: async (): Promise<RosterRow[]> => {
      const { data: links, error } = await supabase
        .from("doctor_patient_links")
        .select("id, patient_id, patients(id, full_name, date_of_birth)")
        .eq("doctor_id", userId!)
        .eq("status", "active");
      if (error) throw error;

      const patients = (links ?? [])
        .map((l) => (l as unknown as { patients: Patient | null }).patients)
        .filter((p): p is Patient => !!p);

      if (!patients.length) return [];
      const ids = patients.map((p) => p.id);

      const [crises, diags] = await Promise.all([
        supabase
          .from("crisis_escalations")
          .select("id, patient_id, status")
          .in("patient_id", ids),
        supabase
          .from("differential_diagnoses")
          .select("id, patient_id, urgency, disclosed_to_patient")
          .in("patient_id", ids)
          .in("urgency", ["emergency", "same_day"])
          .eq("disclosed_to_patient", false),
      ]);
      if (crises.error) throw crises.error;
      if (diags.error) throw diags.error;

      return patients.map((p) => ({
        patient: p,
        openCrises: (crises.data ?? []).filter(
          (c) =>
            (c as { patient_id: string; status: string | null }).patient_id === p.id &&
            ((c as { status: string | null }).status ?? "").toLowerCase() !== "resolved",
        ).length,
        needsAttention: (diags.data ?? []).filter(
          (d) => (d as { patient_id: string }).patient_id === p.id,
        ).length,
      }));
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Patient roster</h1>
        <p className="text-sm text-muted-foreground">
          Patients who have granted you an active care authorization.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active patients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PanelSkeleton rows={4} />
          ) : !data?.length ? (
            <EmptyState text="No patients have linked to your account yet." />
          ) : (
            <ul className="space-y-2">
              {data.map((row) => (
                <li key={row.patient.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: row.patient.id }}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-40">
                      <p className="font-medium">{row.patient.full_name ?? "Unnamed patient"}</p>
                      <p className="text-xs text-muted-foreground">
                        DOB {row.patient.date_of_birth ?? "unknown"}
                      </p>
                    </div>
                    {row.openCrises > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                        <AlertTriangle className="size-3.5" />
                        {row.openCrises} open crisis
                      </span>
                    )}
                    {row.needsAttention > 0 && (
                      <ToneBadge tone="warn">
                        {row.needsAttention} undisclosed high-urgency
                      </ToneBadge>
                    )}
                    <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
