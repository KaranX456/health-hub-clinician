import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AllergiesPanel,
  EmptyState,
  LabResultsPanel,
  MedicalHistoryPanel,
  MedicationsPanel,
  SymptomsPanel,
} from "@/components/dossier/records-panels";
import { DiagnosisPanel } from "@/components/dossier/diagnosis-panel";
import { SafetyPanel } from "@/components/dossier/safety-panel";
import { CommunityInsightsPanel } from "@/components/dossier/community-panel";
import { LongitudinalMonitoringPanel } from "@/components/dossier/monitoring-panel";
import { useSession } from "@/hooks/use-doctor";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  component: DossierPage,
});

function DossierPage() {
  const { patientId } = Route.useParams();
  const { userId } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["patient_access", patientId, userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ patient: Patient | null; authorized: boolean }> => {
      const link = await supabase
        .from("doctor_patient_links")
        .select("id")
        .eq("doctor_id", userId!)
        .eq("patient_id", patientId)
        .eq("status", "active")
        .maybeSingle();
      if (link.error) throw link.error;
      if (!link.data) return { patient: null, authorized: false };

      const { data: patient, error } = await supabase
        .from("patients")
        .select("id, full_name, date_of_birth")
        .eq("id", patientId)
        .maybeSingle();
      if (error) throw error;
      return { patient: (patient as Patient | null) ?? null, authorized: true };
    },
  });

  if (isLoading || !userId) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.authorized || !data.patient) {
    return <EmptyState text="Not authorized for this patient." />;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {data.patient.full_name ?? "Unnamed patient"}
        </h1>
        <p className="text-sm text-muted-foreground">
          DOB {data.patient.date_of_birth ?? "unknown"}
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="safety">Safety</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <MedicalHistoryPanel patientId={patientId} />
          <AllergiesPanel patientId={patientId} />
          <MedicationsPanel patientId={patientId} />
          <SymptomsPanel patientId={patientId} />
          <LabResultsPanel patientId={patientId} />
        </TabsContent>

        <TabsContent value="diagnoses">
          <DiagnosisPanel patientId={patientId} doctorId={userId} />
        </TabsContent>

        <TabsContent value="safety">
          <SafetyPanel patientId={patientId} />
        </TabsContent>

        <TabsContent value="community">
          <CommunityInsightsPanel patientId={patientId} />
        </TabsContent>

        <TabsContent value="monitoring">
          <LongitudinalMonitoringPanel patientId={patientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
