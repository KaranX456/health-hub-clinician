import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, Circle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/clinical-badges";
import { EmptyState, PanelSkeleton } from "@/components/dossier/records-panels";
import { useSession } from "@/hooks/use-doctor";

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Patient Roster — AI Health Companion" },
      { name: "description", content: "Active care authorizations, open crises and patients needing clinician attention." },
      { property: "og:title", content: "Patient Roster — AI Health Companion" },
      { property: "og:description", content: "Review your active patients and clinical attention signals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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

  const totalPatients = data?.length ?? 0;
  const totalCrises = data?.reduce((sum, row) => sum + row.openCrises, 0) ?? 0;
  const totalAttention = data?.reduce((sum, row) => sum + row.needsAttention, 0) ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Patient roster</h1>
        <p className="text-sm text-muted-foreground">
          Patients who have granted you an active care authorization.
        </p>
      </header>

      <dl aria-label="Patient roster statistics" className="flex rounded-lg border border-border bg-card py-5">
        {[
          { label: "Active patients", value: totalPatients, danger: false },
          { label: "Open crises", value: totalCrises, danger: totalCrises > 0 },
          { label: "Needs attention", value: totalAttention, danger: false },
        ].map((stat, i, all) => (
          <div
            key={stat.label}
            className={`flex min-w-0 flex-1 flex-col gap-2 px-3 sm:px-6 ${
              i < all.length - 1 ? "border-r border-border" : ""
            }`}
          >
            <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</dt>
            <dd
              className={`font-stat text-3xl leading-none tabular-nums sm:text-4xl ${
                stat.danger ? "text-destructive" : "text-foreground"
              }`}
            >
              {isLoading ? <span aria-label="Loading" className="inline-block h-9 w-10 animate-pulse rounded bg-muted" /> : stat.value}
            </dd>
          </div>
        ))}
      </dl>


      <Card className="gap-0 border-0 bg-transparent py-0 shadow-none">
        <CardHeader className="border-b border-border px-0 pb-3">
          <CardTitle className="text-base">Active patients</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <PanelSkeleton rows={4} />
          ) : !data?.length ? (
            <EmptyState text="No patients have linked to your account yet." />
          ) : (
            <ul className="divide-y divide-border border-b border-border">
              {data.map((row) => (
                <li key={row.patient.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: row.patient.id }}
                    className="flex flex-wrap items-center gap-3 px-2 py-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {row.openCrises > 0 ? (
                      <AlertTriangle aria-label="Open crisis" className="size-4 shrink-0 text-destructive" />
                    ) : row.needsAttention > 0 ? (
                      <AlertTriangle aria-label="Needs clinician attention" className="size-4 shrink-0 text-warning" />
                    ) : (
                      <Circle aria-label="No flags" className="mx-1 size-2 shrink-0 fill-muted-foreground/40 text-muted-foreground/40" />
                    )}
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
