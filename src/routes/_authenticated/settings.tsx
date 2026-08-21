import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneBadge } from "@/components/clinical-badges";
import { PanelSkeleton } from "@/components/dossier/records-panels";
import { useDoctorProfile, useSession } from "@/hooks/use-doctor";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { userId } = useSession();
  const { data: doctor, isLoading } = useDoctorProfile(userId);
  const [form, setForm] = useState({ full_name: "", license_number: "" });

  useEffect(() => {
    if (doctor) {
      setForm({
        full_name: doctor.full_name ?? "",
        license_number: doctor.license_number ?? "",
      });
    }
  }, [doctor]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("doctors")
        .update({ full_name: form.full_name, license_number: form.license_number })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["doctor", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile &amp; settings</h1>
        <p className="text-sm text-muted-foreground">Manage your clinician record.</p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Clinician profile
            {doctor?.clinician_verified_at ? (
              <ToneBadge tone="ok">Verified</ToneBadge>
            ) : (
              <ToneBadge tone="warn">Verification pending</ToneBadge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PanelSkeleton rows={3} />
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="license_number">License number</Label>
                <Input
                  id="license_number"
                  value={form.license_number}
                  onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={save.isPending || !userId}>
                Save changes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
