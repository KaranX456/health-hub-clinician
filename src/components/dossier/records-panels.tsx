import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Allergy, LabResult, MedicalHistory, Medication, Symptom } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge, ToneBadge } from "@/components/clinical-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function useRows<T>(table: string, columns: string, patientId: string, order?: string) {
  return useQuery({
    queryKey: [table, patientId],
    queryFn: async (): Promise<T[]> => {
      let q = supabase.from(table).select(columns).eq("patient_id", patientId);
      if (order) q = q.order(order, { ascending: false, nullsFirst: false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function Section({
  title,
  children,
  description,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function MedicalHistoryPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useRows<MedicalHistory>(
    "medical_history",
    "id, patient_id, condition_name, icd10_code, status, diagnosed_date, notes",
    patientId,
    "diagnosed_date",
  );
  return (
    <Section title="Medical history">
      {isLoading ? (
        <PanelSkeleton />
      ) : !data?.length ? (
        <EmptyState text="No recorded medical history." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Condition</TableHead>
              <TableHead>ICD-10</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Diagnosed</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.condition_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.icd10_code ?? "—"}</TableCell>
                <TableCell>{r.status ?? "—"}</TableCell>
                <TableCell>{r.diagnosed_date ?? "—"}</TableCell>
                <TableCell className="max-w-[24rem] text-muted-foreground">
                  {r.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

export function AllergiesPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useRows<Allergy>(
    "allergies",
    "id, patient_id, allergen, reaction, severity",
    patientId,
  );
  return (
    <Section title="Allergies">
      {isLoading ? (
        <PanelSkeleton />
      ) : !data?.length ? (
        <EmptyState text="No known allergies recorded." />
      ) : (
        <ul className="space-y-2">
          {data.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3"
            >
              <span className="font-medium">{a.allergen ?? "Unknown allergen"}</span>
              <SeverityBadge severity={a.severity ?? null} />
              <span className="text-sm text-muted-foreground">{a.reaction ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function MedicationsPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useRows<Medication>(
    "medications",
    "id, patient_id, drug_name, dosage, frequency, active",
    patientId,
  );
  return (
    <Section title="Medications">
      {isLoading ? (
        <PanelSkeleton />
      ) : !data?.length ? (
        <EmptyState text="No medications on record." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.drug_name ?? "—"}</TableCell>
                <TableCell>{m.dosage ?? "—"}</TableCell>
                <TableCell>{m.frequency ?? "—"}</TableCell>
                <TableCell>
                  <ToneBadge tone={m.active ? "ok" : "neutral"}>
                    {m.active ? "Active" : "Inactive"}
                  </ToneBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

export function SymptomsPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useRows<Symptom>(
    "symptoms",
    "id, patient_id, description, body_location, onset_date, severity, source",
    patientId,
    "onset_date",
  );
  return (
    <Section title="Symptom timeline" description="Most recent onset first.">
      {isLoading ? (
        <PanelSkeleton />
      ) : !data?.length ? (
        <EmptyState text="No symptoms reported." />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {data.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.description ?? "Symptom"}</span>
                {s.severity != null && <ToneBadge tone="info">Severity {s.severity}</ToneBadge>}
                {s.source && <ToneBadge tone="neutral">{s.source}</ToneBadge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.body_location ?? "Unspecified location"} · onset {s.onset_date ?? "unknown"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

export function LabResultsPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useRows<LabResult>(
    "lab_results",
    "id, patient_id, test_name, value, unit, reference_range, ingestion_path, reviewed_and_corrected",
    patientId,
  );
  return (
    <Section title="Lab results">
      {isLoading ? (
        <PanelSkeleton />
      ) : !data?.length ? (
        <EmptyState text="No lab results available." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Ingestion</TableHead>
              <TableHead>Reviewed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.test_name ?? "—"}</TableCell>
                <TableCell>
                  {l.value ?? "—"} {l.unit ?? ""}
                </TableCell>
                <TableCell className="text-muted-foreground">{l.reference_range ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{l.ingestion_path ?? "—"}</TableCell>
                <TableCell>
                  <ToneBadge tone={l.reviewed_and_corrected ? "ok" : "warn"}>
                    {l.reviewed_and_corrected ? "Reviewed" : "Unreviewed"}
                  </ToneBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}